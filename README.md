# TODOs
- CEventEncryptEvList 一个机器人收到这个event后，应该对这里面的event 调用CClientBase的一个方法。问题在于，现在很多robot共用一个CClientBase，这样每个robot都调一次行么？看起来行，先简单实现
- 进入房间后的心跳怎么处理。

Event的定义是不是应该跟Action的分开？

一个Event应该返回什么数据？

Event有两类，request和response。
request需要设置参数，response需要返回一些数据

怎么设置参数？
有些参数是人设置的，在运行前手工指定。


用户数据到底存哪边？如果存js这边，还需要js去解析yml，知道每次要发什么args过去，看起来挺麻烦的

如果存c++那边，那么就需要在一开始把每个机器人的预设值的数据给填充好。