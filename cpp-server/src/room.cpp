#include "room.h"
#include "session.h"   // full definition of Session
#include <iostream>
#include <unordered_map>
#include <chrono>
using json = nlohmann::json;

Room::Room() : nextPlayerId(1), m_lastActivity(std::chrono::steady_clock::now()) {}

void Room::updateActivity() {
    m_lastActivity = std::chrono::steady_clock::now();
}

std::chrono::steady_clock::time_point Room::getLastActivity() const {
    return m_lastActivity;
}

// Default constructor is now defined in header

void Room::join(std::shared_ptr<Session> s, const std::string& username) {
    nlohmann::json joinMsg;
    bool isNewPlayer = false;

    {
        std::lock_guard<std::mutex> lock(m_mutex);

        if (players.find(username) == players.end()) {
            Player p{ nextPlayerId++, username, 0 };
            players[username] = p;
            isNewPlayer = true;

            joinMsg = {
                {"type", "join"},
                {"payload", {
                    {"id", p.id},
                    {"username", p.username}
                }}
            };
        }

        if (s) {
            m_sessions.insert(s);
        }
        
        // Update activity timestamp
        updateActivity();
    }

    // Broadcast outside of mutex lock to avoid deadlock
    if (isNewPlayer) {
        broadcast(joinMsg.dump());
    }

    if (s) {
        replayPlayers(s);
        replayHistory(s);
    }
}


bool Room::leave(std::shared_ptr<Session> s) {
    std::lock_guard<std::mutex> lock(m_mutex);

    // just remove the session
    auto it = m_sessions.find(s);
    if (it != m_sessions.end()) {
        m_sessions.erase(it);
    }

    return m_sessions.empty();
}

void Room::resetLobby() {
    std::lock_guard<std::mutex> lock(m_mutex);
    players.clear();
    nextPlayerId = 1;
}

void Room::broadcast(const std::string& msg) {
    for (auto& s : m_sessions) {
        if (s) s->send(msg);
    }
}

bool Room::empty() {
    std::lock_guard<std::mutex> lock(m_mutex);
    return m_sessions.empty();
}

void Room::endRound() {
    json msg = { {"type","round_end"}, {"payload","Round finished!"} };
    broadcast(msg.dump());
}

bool Room::hasPlayer(const std::string& username) {
    std::lock_guard<std::mutex> lock(m_mutex);
    return players.find(username) != players.end();
}

// room.cpp
void Room::addStroke(const json& stroke) {
    std::lock_guard<std::mutex> lock(m_mutex);
    strokeHistory.push_back(stroke);
    updateActivity();
}

void Room::clearHistory() {
    std::lock_guard<std::mutex> lock(m_mutex);
    strokeHistory.clear();
}

void Room::replayHistory(std::shared_ptr<Session> s) {
    std::vector<json> strokesCopy;

    {
        std::lock_guard<std::mutex> lock(m_mutex);
        strokesCopy = strokeHistory; // Copy the strokes
    }

    // Send strokes outside of mutex lock
    for (auto& stroke : strokesCopy) {
        std::cout << "[DEBUG] Replaying stroke to " << (s ? "session" : "null") << "\n";
        if (s) s->send(stroke.dump());
    }
}

void Room::replayPlayers(std::shared_ptr<Session> s) {
    std::vector<std::pair<int, std::string>> playerData;

    {
        std::lock_guard<std::mutex> lock(m_mutex);
        for (auto& [username, p] : players) {
            playerData.push_back({ p.id, p.username });
        }
    }

    // Send player data outside of mutex lock
    for (auto& [id, username] : playerData) {
        nlohmann::json joinMsg = {
            {"type", "join"},
            {"payload", {
                {"id", id},
                {"username", username}
            }}
        };
        if (s) s->send(joinMsg.dump());
    }
}

std::unordered_set<std::string> Room::getPlayerUsernames() const {
    std::lock_guard<std::mutex> lock(m_mutex);
    std::unordered_set<std::string> usernames;
    for (const auto& [username, p] : players) {
        usernames.insert(username);
    }
    return usernames;
}