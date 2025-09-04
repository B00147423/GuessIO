#include "GameProtocol.h"
#include <iostream>

void GameProtocol::handleCommand(const std::string& msg, Player& player) {
    // TODO: parse command string (JOIN, GUESS, DRAW, etc.)
    // Update player state / scores
}

void GameProtocol::broadcast(const std::string& msg) {
    // TODO: call server.broadcast(msg)
}
