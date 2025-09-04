#include "TwitchClient.h"
#include "server.h"
#include <iostream>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

TwitchClient::TwitchClient(boost::asio::io_context& io,
    Server& server,
    const std::string& oauth,
    const std::string& nick,
    const std::string& channel)
    : m_resolver(io),
    m_socket(io),
    m_server(server),
    m_oauth(oauth),
    m_nick(nick),
    m_channel(channel),
    m_channelRooms() { // Initialize empty
}

void TwitchClient::connect() {
    auto self = shared_from_this(); // keep alive
    auto endpoints = m_resolver.resolve("irc.chat.twitch.tv", "6667");
    boost::asio::async_connect(m_socket, endpoints,
        [self](boost::system::error_code ec, const auto&) {
            if (!ec) {
                self->login();
            }
            else {
                std::cerr << "Twitch connect error: " << ec.message() << "\n";
            }
        });
}

void TwitchClient::login() {
    auto self = shared_from_this(); // keep alive
    m_buffer.consume(m_buffer.size());

    send("CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership\r\n");
    send("PASS " + m_oauth + "\r\n");
    send("NICK " + m_nick + "\r\n");
    send("JOIN " + m_channel + "\r\n");

    doRead();
}

void TwitchClient::send(const std::string& msg) {
    auto self = shared_from_this(); // keep alive
    auto buffer = std::make_shared<std::string>(msg);
    boost::asio::async_write(m_socket, boost::asio::buffer(*buffer),
        [self, buffer](boost::system::error_code ec, std::size_t) {
            if (ec) {
                std::cerr << "Twitch send error: " << ec.message() << "\n";
            }
        });
}
void TwitchClient::disconnect() {
    if (m_socket.is_open()) {
        // Send PART so Twitch IRC knows we’re leaving the channel
        std::string partCmd = "PART " + m_channel + "\r\n";
        boost::asio::write(m_socket, boost::asio::buffer(partCmd));

        std::string quitCmd = "QUIT\r\n";
        boost::asio::write(m_socket, boost::asio::buffer(quitCmd));

        // Close the socket
        boost::system::error_code ec;
        m_socket.close(ec);

        if (!ec) {
            std::cout << "[INFO] Disconnected from channel " << m_channel << "\n";
        }
        else {
            std::cout << "[ERROR] Failed to close socket for " << m_channel
                << ": " << ec.message() << "\n";
        }
    }
}

void TwitchClient::doRead() {
    auto self = shared_from_this(); // keep alive
    boost::asio::async_read_until(m_socket, m_buffer, "\r\n",
        [self](boost::system::error_code ec, std::size_t) {
            if (!ec) {
                std::istream is(&self->m_buffer);
                std::string line;

                while (std::getline(is, line)) {
                    if (!line.empty() && line.back() == '\r')
                        line.pop_back();
                    if (line.empty()) continue;

                    std::cout << "[RAW] " << line << "\n";

                    // PING
                    if (line.rfind("PING", 0) == 0) {
                        self->send("PONG :tmi.twitch.tv\r\n");
                        continue;
                    }

                    // Connected
                    if (line.find(" 001 ") != std::string::npos) {
                        json okMsg = {
                            {"type","status"},
                            {"status","ok"},
                            {"message","Bot connected to Twitch IRC"},
                            {"channel", self->m_channel}
                        };
                        std::cout << "[DEBUG] TwitchClient connected to channel "
                            << self->m_channel << std::endl;
                        self->m_server.onClientMessage(nullptr, okMsg.dump());
                        continue;
                    }

                    // PRIVMSG (chat)
                    if (line.find("PRIVMSG") != std::string::npos) {
                        // --- Extract chatter username ---
                        std::string username;

                        // Modern Twitch IRC format: @display-name=username;login=username;...
                        if (line[0] == '@') {
                            // Look for display-name tag first
                            size_t dnPos = line.find("display-name=");
                            if (dnPos != std::string::npos) {
                                size_t end = line.find(';', dnPos);
                                if (end == std::string::npos) end = line.find(' ', dnPos);
                                if (end != std::string::npos) {
                                    username = line.substr(dnPos + 13, end - (dnPos + 13));
                                }
                            }

                            // Fallback to login tag if display-name failed
                            if (username.empty()) {
                                size_t loginPos = line.find("login=");
                                if (loginPos != std::string::npos) {
                                    size_t end = line.find(';', loginPos);
                                    if (end == std::string::npos) end = line.find(' ', loginPos);
                                    if (end != std::string::npos) {
                                        username = line.substr(loginPos + 6, end - (loginPos + 6));
                                    }
                                }
                            }
                        }

                        // Legacy fallback: extract from IRC format
                        if (username.empty()) {
                            size_t exMark = line.find('!');
                            if (exMark != std::string::npos && exMark > 1) {
                                username = line.substr(1, exMark - 1);
                            }
                        }

                        // --- Extract only the actual chat message (after the last ':') ---
                        std::string message;
                        size_t lastColon = line.rfind(':');
                        if (lastColon != std::string::npos) {
                            message = line.substr(lastColon + 1);  // after last colon → "!join"
                        }

                        std::cout << "[CHAT] " << username << ": " << message << "\n";
                        std::cout << "[DEBUG] Raw IRC line: " << line << std::endl;
                        std::cout << "[DEBUG] Extracted username: " << username << std::endl;
                        std::cout << "[DEBUG] Extracted message: " << message << std::endl;
                        std::cout << "[DEBUG] Username empty? " << (username.empty() ? "YES" : "NO") << std::endl;
                        std::cout << "[DEBUG] Line starts with @? " << (line[0] == '@' ? "YES" : "NO") << std::endl;
                        std::cout << "[DEBUG] Found display-name at: " << line.find("display-name=") << std::endl;
                        std::cout << "[DEBUG] Found login at: " << line.find("login=") << std::endl;

                        std::cout << "[DEBUG] Parsed message: " << message << std::endl;

                        // --- Handle commands ---
                        if (message.rfind("!join", 0) == 0) {
                            // Get the current room for this specific channel
                            std::string targetRoom;
                            auto it = self->m_channelRooms.find(self->m_channel);
                            if (it != self->m_channelRooms.end()) {
                                targetRoom = it->second;
                                std::cout << "[DEBUG] Using tracked room for channel " << self->m_channel << ": " << targetRoom << std::endl;
                            } else {
                                // Fallback: use channel name if no room is tracked
                                targetRoom = self->m_channel.substr(1);
                                std::cout << "[DEBUG] No room tracked for channel " << self->m_channel << ", using fallback: " << targetRoom << std::endl;
                            }
                            
                            json joinMsg = {
                                {"type","join"},
                                {"room", targetRoom},
                                {"payload", username}
                            };
                            std::cout << "[DEBUG] TwitchClient sending join event to room: "
                                << targetRoom << " - " << joinMsg.dump() << std::endl;
                            self->m_server.onClientMessage(nullptr, joinMsg.dump());
                        }
                        else if (message.rfind("!guess ", 0) == 0) {
                            std::string guess = message.substr(7);
                            json guessMsg = {
                                {"type","chat"},
                                {"room", self->m_channel.substr(1)},
                                {"payload", username + " guessed: " + guess}
                            };
                            std::cout << "[DEBUG] TwitchClient sending guess event: "
                                << guessMsg.dump() << std::endl;
                            self->m_server.onClientMessage(nullptr, guessMsg.dump());
                        }
                        else {
                            json chatMsg = {
                                {"type","chat"},
                                {"room", self->m_channel.substr(1)},
                                {"payload", username + ": " + message}
                            };
                            std::cout << "[DEBUG] TwitchClient sending chat event: "
                                << chatMsg.dump() << std::endl;
                            self->m_server.onClientMessage(nullptr, chatMsg.dump());
                        }
                    }
                }

                self->doRead(); // keep reading
            }
            else {
                std::cerr << "Twitch read error: " << ec.message() << "\n";
            }
        });
}

void TwitchClient::setCurrentRoom(const std::string& channel, const std::string& roomName) {
    m_channelRooms[channel] = roomName;
    std::cout << "[DEBUG] TwitchClient set room for channel " << channel << " to: " << roomName << std::endl;
}
