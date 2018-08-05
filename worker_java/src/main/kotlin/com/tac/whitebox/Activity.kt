package com.tac.whitebox

import io.reactivex.Maybe
import io.reactivex.Observable
import org.apache.commons.logging.LogFactory
import org.springframework.stereotype.Component

interface ActivityResult

interface ActivityContext

interface Activity {
    fun proceed(ctx: ActivityContext): Observable<ActivityResult>
    fun parse(data: Any)
}

abstract class SimpleActivity : Activity {
    override fun proceed(ctx: ActivityContext): Observable<ActivityResult> {
        return doProceed(ctx).filter {
            return@filter (it is ActivityResult)
        }.map {
            it as ActivityResult
        }.toObservable()
    }

    override fun parse(data: Any) {
        doParse(data)
    }

    abstract fun doProceed(ctx: ActivityContext): Maybe<out Any>
    abstract fun doParse(data: Any)
}

class EchoActivity(val message: String) : SimpleActivity() {
    override fun doParse(data: Any) {
        TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

    companion object {
        val logger = LogFactory.getLog(EchoActivity::class.java)
    }

    override fun doProceed(ctx: ActivityContext): Maybe<out Any> {
        return Maybe.empty<Any>().doOnComplete {
            logger.info(message)
        }
    }
}

class ConnectActivity(private val grpc: GRPC) : SimpleActivity() {
    override fun doParse(data: Any) {
        TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

    val address = ""
    val port = 0
    override fun doProceed(ctx: ActivityContext): Maybe<out Any> {
        if (ctx !is RobotActivityContext) {
            return Maybe.error(RuntimeException())
        }

        val p = Common.ConnectParams.newBuilder()
                .setAddress(address)
                .setConnectionId(Common.ConnectionIdentity.newBuilder().setAccount(ctx.robot.account))
                .build()
        return grpc.connect(p).toMaybe()
    }

}

open class CompositeActivity : Activity {
    override fun parse(data: Any) {
        TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

    override fun proceed(ctx: ActivityContext): Observable<ActivityResult> {
        return Observable.fromIterable(activities).concatMap {
            it.proceed(ctx)
        }
    }

    val activities: List<Activity> = mutableListOf()


}

class LoopActivity : CompositeActivity() {
    private val loopTimes = 1L

    override fun proceed(ctx: ActivityContext): Observable<ActivityResult> {
        return super.proceed(ctx).repeat(loopTimes)
    }
}

interface ActivityFactory {
    fun create(data: Any): Activity
}

@Component
class DefaultActivityFactory : ActivityFactory {
    override fun create(data: Any): Activity {
        val a = CompositeActivity()
        a.parse(data)
        return a
    }

}