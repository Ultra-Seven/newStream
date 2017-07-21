'''
ringbuf.py

Implements a ring buffer simillar to the on in js/ringbuffer.js.
Used to synchronize the buffer in the client and server.
'''

class ringbuf(object):
    def __init__(self, size):
        self.size = size
        self.blocks = []
