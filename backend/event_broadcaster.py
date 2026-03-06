"""
Thread-safe event broadcaster for pushing server events (e.g. new block) to SSE clients.
Used by the block monitor (writer) and API server (SSE endpoint, reader).
"""

import queue
import threading

_queues: list = []
_lock = threading.Lock()


def subscribe():
    """Create a new queue and add it to the subscriber list. Returns the queue."""
    with _lock:
        q = queue.Queue()
        _queues.append(q)
        return q


def unsubscribe(q):
    """Remove a queue from the subscriber list."""
    with _lock:
        if q in _queues:
            _queues.remove(q)


def broadcast(event: dict) -> None:
    """Push an event dict to all subscribed queues. Thread-safe."""
    with _lock:
        copy = list(_queues)
    for q in copy:
        try:
            q.put_nowait(event)
        except queue.Full:
            pass
