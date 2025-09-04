#pragma once
#include <unordered_map>
#include <memory>
#include <string>
#include "TwitchClient.h"
#include <iostream>
#include "TwitchBotManager.h"
#include "TwitchClient.h"
#include "server.h"
#include <iostream>
#include <boost/asio.hpp>
#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <deque>
#include <mutex>
#include <string>
#include <memory>
#include "session.h"

// Forward declaration to avoid circular dependency
class Server;

class TwitchBotManager {
public:
    TwitchBotManager(boost::asio::io_context& io, Server& server)
        : m_io(io), m_server(server) {
    }

    bool spawnBot(const std::string& oauth,
        const std::string& nick,
        const std::string& channel);
    void stopBot(const std::string& channel);  // add this
    void setCurrentRoom(const std::string& channel, const std::string& roomName); // Set current room for specific channel
private:
    boost::asio::io_context& m_io;
    Server& m_server;
    std::unordered_map<std::string, std::shared_ptr<TwitchClient>> m_bots;
};
