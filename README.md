# TODOs
- CEventEncryptEvList 一个机器人收到这个event后，应该对这里面的event 调用CClientBase的一个方法。问题在于，现在很多robot共用一个CClientBase，这样每个robot都调一次行么？看起来行，先简单实现
- 进入房间后的心跳怎么处理。

Event的定义是不是应该跟Action的分开？

一个Event应该返回什么数据？

Event有两类，request和response。
request需要设置参数，response需要返回一些数据