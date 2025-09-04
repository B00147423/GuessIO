#pragma once
#include <string>
#include <unordered_map>

struct Player {
    std::string username;
    int score = 0;
};

class GameProtocol {
public:
    void handleCommand(const std::string& msg, Player& player);
    void broadcast(const std::string& msg);

private:
    std::unordered_map<int, Player> players_;
};
