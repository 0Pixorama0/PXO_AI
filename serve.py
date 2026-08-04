"""Static server for the prototype, with caching turned off.

Python's stock http.server sends Last-Modified but no Cache-Control, so
browsers apply heuristic caching and keep serving an old main.js or
components.css after an edit. That has produced several false "it is still
broken" reports. Nothing here is worth caching, so nothing is.

    python serve.py [port]        # default 4780
"""

import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # Quiet: one line per request drowns the terminal during a verify run.
        pass


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4780
    server = ThreadingHTTPServer(("127.0.0.1", port), partial(NoCacheHandler, directory="."))
    print(f"serving {port} with no-store; ctrl-c to stop")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()


if __name__ == "__main__":
    main()
