'''
ringbuf.py

Implements a ring buffer simillar to the on in js/ringbuffer.js.
Used to synchronize the buffer in the client and server.
'''
import json

def overlaps(r1, r2):
    return (r1[0] <= r2[0] <= r1[1]) or (r1[0] <= r2[1] <= r1[1]) or (r2[0] <= r1[0] <= r2[1]) or (r2[0] <= r1[1] <= r2[1])

class ringbuf(object):

    '''
    self.blocks = [{
        range,
        meta
    }, ...]
    '''

    def __init__(self, size):
        self.size = size
        self.blocks = []

    def range_overlaps(self, r1, r2):
        if r1[1] < r1[0]:
            r1 = (r1[0], r1[1] + self.size)
        if r2[1] < r2[0]:
            r2 = (r2[0], r2[1] + self.size)
        return overlaps(r1, r2) or overlaps(r1, (r2[0]+self.size, r2[1]+self.size)) or overlaps((r1[0]+self.size, r1[1]+self.size), r2)

    def add(self, size, meta):
        if size > self.size:
            raise Exception("data size exceeds buffer size")
        r = None
        if len(self.blocks) == 0:
            r = (0, size-1)
            self.blocks.append({'range': r, 'meta': meta})
            return r
        else:
            base = self.blocks[-1]['range'][1]
            r = (base+1, base+size)

        while self.range_overlaps(self.blocks[0]['range'], r):
            self.blocks.pop(0)
            if len(self.blocks) == 0:
                break

        r = (r[0] % self.size, r[1] % self.size)
        self.blocks.append({'range': r, 'meta': meta})
        return r

    def retrive(self, f, g=lambda x:x):
        result = []
        for block in self.blocks:
            if f(block):
                result.append(g(block))
        return result

    # print out the detail of the ring buffer, used for debug
    def list_block(self):
        print json.dumps(self.blocks, indent=2)

