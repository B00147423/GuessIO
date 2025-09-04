#include "roomManager.h"
#include "session.h"
#include "server.h"
#include "TwitchClient.h"      // fixes TwitchClient errors
#include <iostream>

using json = nlohmann::json;

void RoomManager::joinRoom(const std::string& roomId, std::shared_ptr<Session> s, const std::string& username) {
    std::lock_guard<std::mutex> lock(m_mutex);
    m_rooms[roomId].join(s, username);
}

void RoomManager::leaveAll(std::shared_ptr<Session> s) {
    std::lock_guard<std::mutex> lock(m_mutex);
    for (auto& pair : m_rooms) {
        const std::string& id = pair.first;
        Room& room = pair.second;

        if (room.leave(s)) {
            json sysMsg = {
                {"type", "system"},
                {"room", id},
                {"payload", "Streamer disconnected, lobby cleared"}
            };
            room.broadcast(sysMsg.dump());

            // clear players too if streamer disconnects
            room.resetLobby();
        }
    }
}

static std::string normalizeRoom(const std::string& roomId) {
    if (!roomId.empty() && roomId[0] == '#')
        return roomId.substr(1);
    return roomId;
}
void RoomManager::handleJoin(std::shared_ptr<Session> s, const nlohmann::json& j, const std::string& roomId) {
    // Clean up any abandoned rooms first
    cleanupAbandonedRooms();
    
    // Also clean up expired rooms (inactive for 1+ hours)
    cleanupExpiredRooms();

    std::string username;

    // Accept both string and object payloads
    if (j["payload"].is_string()) {
        username = j["payload"].get<std::string>();
    }
    else if (j["payload"].is_object()) {
        username = j["payload"].value("username", "");
    }

    if (username.empty()) return;

    Room* room;
    bool isNewRoom = false;
    {
        std::lock_guard<std::mutex> lock(m_mutex);
        auto it = m_rooms.find(roomId);
        if (it == m_rooms.end()) {
            // This is a new room being created
            isNewRoom = true;
            std::cout << "[ROOM] Creating new room: " << roomId << std::endl;
        }
        room = &m_rooms[roomId];
    }
    
    // If this is a new room, set it as the current room for the Twitch bot
    if (isNewRoom && m_server) {
        // Extract channel from the join message
        std::string channel = j.value("channel", "");
        if (!channel.empty()) {
            // Store the channel this room belongs to
            m_roomChannels[roomId] = channel;
            std::cout << "[ROOM] Room " << roomId << " belongs to channel " << channel << std::endl;
            
            // Set this as the current room for that channel's Twitch bot
            m_server->setCurrentRoom("#" + channel, roomId);
        } else {
            std::cout << "[WARN] No channel specified for new room " << roomId << std::endl;
        }
    }

    if (room->hasPlayer(username)) {
        std::cout << "[SPAM] Duplicate join from " << username << " (replaying state)\n";
        if (s) {
            room->join(s, username);     // attach new session
            room->replayPlayers(s);      // send full player list
            room->replayHistory(s);      // send all strokes
        }
        return;
    }

    // First-time join
    room->join(s, username);
}




void RoomManager::handleLeave(std::shared_ptr<Session> s, const nlohmann::json& j, const std::string& roomId) {
    auto it = m_rooms.find(roomId);
    if (it != m_rooms.end()) {
        Room& room = it->second;

        for (auto& [uname, p] : room.getPlayers()) {
            if (room.leave(s)) {
                nlohmann::json leaveMsg = {
                    {"type", "leave"},
                    {"payload", {
                        {"id", p.id},
                        {"username", uname}
                    }}
                };
                room.broadcast(leaveMsg.dump());
            }
        }

        // Clean up abandoned rooms
        if (room.empty()) {
            std::cout << "[ROOM] Room " << roomId << " is empty, removing it" << std::endl;
            m_rooms.erase(it);
        }
    }
}


void RoomManager::handleChat(std::shared_ptr<Session>, const json& j, const std::string& roomId) {
    std::string payload = j.value("payload", "");
    if (!roomId.empty() && !payload.empty()) {
        json chatMsg = { {"type","chat"}, {"room",roomId}, {"payload",payload} };
        m_rooms[roomId].broadcast(chatMsg.dump());
    }
}

void RoomManager::handleEndRound(const std::string& roomId) {
    auto it = m_rooms.find(roomId);
    if (it != m_rooms.end()) {
        it->second.endRound();
    }
}

void RoomManager::handleStopBot(const json& j) {
    std::string channel = j.value("channel", "");
    if (m_server) {
        m_server->stopBot(channel);
        std::cout << "ADMIN Stopped Twitch bot for channel: " << channel << "\n";
    }
}

void RoomManager::handleSpawnBot(const json& j) {
    std::string oauth = j.value("oauth", "");
    std::string nick = j.value("nick", "");
    std::string channel = j.value("channel", "");

    if (m_server) {
        bool spawned = m_server->spawnBot(oauth, nick, channel);
        if (spawned) {
            std::cout << "ADMIN Spawned Twitch bot for channel: " << channel << "\n";
        }
        else {
            std::cout << "[ADMIN] Bot for channel " << channel << " already exists, ignoring spawn.\n";
        }
    }
}

void RoomManager::handleStatus(const std::string& jsonMsg) {
    if (m_server) {
        m_server->broadcast(jsonMsg);
    }
}

void RoomManager::handleDraw(std::shared_ptr<Session> s, const json& j, const std::string& roomId) {
    if (roomId.empty()) return;

    json drawMsg = {
        {"type", "draw"},
        {"room", roomId},
        {"payload", j["payload"]}
    };

    // store in room history
    m_rooms[roomId].addStroke(drawMsg);

    // broadcast to all
    m_rooms[roomId].broadcast(drawMsg.dump());
}

void RoomManager::handleClear(std::shared_ptr<Session> s, const json& j, const std::string& roomId) {
    if (roomId.empty()) return;

    json clearMsg = {
        {"type", "clear"},
        {"room", roomId}
    };

    // clear room history
    m_rooms[roomId].clearHistory();

    // broadcast clear
    m_rooms[roomId].broadcast(clearMsg.dump());
}

void RoomManager::handleRestoreState(std::shared_ptr<Session> s, const std::string& roomId) {
    std::cout << "[DEBUG] handleRestoreState called for room: " << roomId << std::endl;
    if (roomId.empty() || !s) return;

    auto it = m_rooms.find(roomId);
    if (it != m_rooms.end()) {
        const Room& room = it->second;

        // Get data outside of any potential locks
        std::vector<std::string> playerUsernames;
        std::vector<json> strokeHistory;

        {
            std::lock_guard<std::mutex> lock(m_mutex);
            // Fix: Get the data first, then copy it properly
            auto usernames = room.getPlayerUsernames();
            playerUsernames.assign(usernames.begin(), usernames.end());
            strokeHistory = room.getStrokeHistory();
        }

        // Send current state back to client
        json response;
        response["type"] = "current_state";
        response["payload"]["players"] = playerUsernames;
        response["payload"]["strokes"] = strokeHistory;

        std::cout << "[DEBUG] About to send state with " << strokeHistory.size() << " strokes" << std::endl;
        s->send(response.dump());
        std::cout << "[STATE] Sent current state to client for room: " << roomId << std::endl;
    }
    else {
        std::cout << "[DEBUG] Room not found: " << roomId << std::endl;
    }
}

void RoomManager::cleanupAbandonedRooms() {
    std::lock_guard<std::mutex> lock(m_mutex);

    auto it = m_rooms.begin();
    while (it != m_rooms.end()) {
        if (it->second.empty()) {
            std::cout << "[ROOM] Cleaning up abandoned room: " << it->first << std::endl;
            it = m_rooms.erase(it);
        }
        else {
            ++it;
        }
    }
}

void RoomManager::cleanupExpiredRooms() {
    std::lock_guard<std::mutex> lock(m_mutex);
    
    auto now = std::chrono::steady_clock::now();
    auto oneHour = std::chrono::hours(1);
    
    auto it = m_rooms.begin();
    while (it != m_rooms.end()) {
        auto lastActivity = it->second.getLastActivity();
        if (now - lastActivity > oneHour) {
            std::cout << "[ROOM] Cleaning up expired room: " << it->first 
                      << " (inactive for " << std::chrono::duration_cast<std::chrono::minutes>(now - lastActivity).count() << " minutes)" << std::endl;
            
            // Remove from room channels tracking
            m_roomChannels.erase(it->first);
            
            it = m_rooms.erase(it);
        } else {
            ++it;
        }
    }
}


void RoomManager::onMessage(std::shared_ptr<Session> s, const std::string& jsonMsg) {
    try {
        auto j = json::parse(jsonMsg);
        std::string type = j.value("type", "");
        std::string roomId = normalizeRoom(j.value("room", ""));

        if (type == "join")        handleJoin(s, j, roomId);
        else if (type == "leave")  handleLeave(s, j, roomId);
        else if (type == "chat")   handleChat(s, j, roomId);
        else if (type == "end_round") handleEndRound(roomId);
        else if (type == "stop_bot")  handleStopBot(j);
        else if (type == "spawn_bot") handleSpawnBot(j);
        else if (type == "status")    handleStatus(jsonMsg);
        else if (type == "pong" && s) s->markPongReceived();
        else if (type == "draw")      handleDraw(s, j, roomId);
        else if (type == "clear")     handleClear(s, j, roomId);
        else if (type == "get_state") handleRestoreState(s, roomId);
        else {
            std::cerr << "[WARN] Unknown type: " << type << " msg=" << jsonMsg << "\n";
        }
    }
    catch (const std::exception& e) {
        std::cerr << "[ERROR] onMessage parse failed: " << e.what()
            << " raw=" << jsonMsg << "\n";
    }
}


