# TODOs
CEventEncryptEvList 一个机器人收到这个event后，应该对这里面的event 调用CClientBase的一个方法。问题在于，现在很多robot共用一个CClientBase，这样每个robot都调一次行么？看起来行，先简单实现

进入房间后的心跳怎么处理？？
有一种办法：
引入一个event机制，让action result能有机会引起一个event
或者用声明式，通过状态来决定是否运行心跳


怎么设置参数？
有些参数是人设置的，在运行前手工指定。

执行速率限制。比如，1000个机器人正在跑，突然服务器踢掉了全部，那么会在一瞬间有1000个机器人去重连，服务器吃不消。
可能需要吧接受job和控制job执行的功能模块分开
或者，job receiver慢慢的接收任务