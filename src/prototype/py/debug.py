from StringIO import StringIO
import datetime

class DebugLogger(object):
    """
    Debug class for stream

    debug codes

        1   : get query distribution
        2   : before executing scheduler
        3   : after executing scheduler
        4   : set ringbuffer size
        104 : send data from proportional scheduler


    """
    def __init__(self, **kwargs):
        self.toFile = kwargs.get('toFile', False)
        self.logPath = kwargs.get('logPath', 'stream.log')
        if self.toFile:
            self.f = open(self.logPath, 'a')
            self.f.write('--------------------------------------------------\n')
            self.f.write(datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S') + '\n')
            self.buf = StringIO()
    def __del__(self):
        if self.toFile:
            self.log.close()

    def log(self, msg):
        s = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f') + ' -- ' + msg
        if self.toFile:
            self.buf.write(s + '\n')
        else:
            print s

    def writeLog(self):
        if self.toFile:
            self.f.write(self.buf.getvalue())
            self.buf.close()
            self.buf = StringIO()
