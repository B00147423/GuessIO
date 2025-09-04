#include "server.h"
#include "TwitchBotManager.h"
#include <boost/asio.hpp>
#include <thread>
#include <vector>
#include <iostream>
#include <csignal>
#include <atomic>
#include <fstream>
#include <nlohmann/json.hpp>

// global running flag
std::atomic<bool> running(true);

// load JSON config
nlohmann::json loadConfig(const std::string& path) {
    std::ifstream f(path);
    if (!f.is_open()) {
        throw std::runtime_error("Could not open config file: " + path);
    }
    nlohmann::json j;
    f >> j;
    return j;
}

// signal handler
void handleSignal(int) {
    running = false;
}

int main() {
    try {
        std::cout << "Starting server...\n";
        signal(SIGINT, handleSignal);
        std::signal(SIGTERM, handleSignal);

        std::cout << "Creating io_context...\n";
        boost::asio::io_context io;

        std::cout << "Creating server...\n";
        Server server(io, 9001);

        std::cout << "Creating TwitchBotManager...\n";
        TwitchBotManager botManager(io, server);

        std::cout << "Setting bot manager...\n";
        server.setBotManager(&botManager);

        std::cout << "Starting server...\n";
        server.start();
        std::cout << "Server started successfully on port 9001\n";

        // load secrets from config.json
        auto cfg = loadConfig("config.json");
        std::string oauth = cfg.value("TWITCH_OAUTH", "");
        std::string nick = cfg.value("TWITCH_NICK", "");
        std::string channel = cfg.value("TWITCH_CHANNEL", "");

        // spawn bot
        std::cout << "Spawning Twitch bot for channel " << channel << "...\n";
        bool botSpawned = server.spawnBot(oauth, nick, channel);

        if (botSpawned) {
            std::cout << "Twitch bot spawned successfully!\n";
        }
        else {
            std::cout << "Failed to spawn Twitch bot!\n";
        }

        // thread pool
        unsigned int numThreads = std::thread::hardware_concurrency();
        if (numThreads == 0) numThreads = 4;
        std::vector<std::thread> pool;
        pool.reserve(numThreads);
        for (unsigned int i = 0; i < numThreads; ++i)
            pool.emplace_back([&io]() { io.run(); });

        // main loop
        while (running) {
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }

        server.broadcast(R"({"type":"system","payload":"server shutting down"})");

        io.stop();
        for (auto& t : pool) t.join();
    }
    catch (const std::exception& e) {
        std::cerr << "Fatal error: " << e.what() << "\n";
    }
}
