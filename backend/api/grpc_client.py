import grpc
from ..grpc import guessio_pb2, guessio_pb2_grpc


class GuessIOClient:
    def __init__(self, host="localhost", port=50051):
        self.channel = grpc.insecure_channel(f"{host}:{port}")
        self.stub = guessio_pb2_grpc.GuessServiceStub(self.channel)

    def join_game(self, username: str):
        req = guessio_pb2.JoinRequest(username=username)
        reply = self.stub.JoinGame(req)
        return reply.message

    def make_guess(self, username: str, guess: str):
        req = guessio_pb2.GuessRequest(username=username, guess=guess)
        reply = self.stub.MakeGuess(req)
        return {"correct": reply.correct, "hint": reply.hint}
