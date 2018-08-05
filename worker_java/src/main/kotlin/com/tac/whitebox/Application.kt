package com.tac.whitebox

import io.grpc.ManagedChannelBuilder
import io.grpc.stub.StreamObserver
import io.reactivex.Completable
import io.reactivex.Observable
import io.reactivex.Single
import io.reactivex.subjects.PublishSubject
import io.reactivex.subjects.Subject
import org.apache.commons.logging.LogFactory
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.CommandLineRunner
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Profile
import org.springframework.stereotype.Component
import java.io.File
import javax.xml.bind.Element
import javax.xml.parsers.DocumentBuilderFactory

fun <T, R, S> wrap(f: (S, T, StreamObserver<R>) -> Unit, stub: S, param: T): Observable<R> {
    return Observable.create { emitter ->
        run {
            f(stub, param, object : StreamObserver<R> {
                override fun onNext(value: R) {
                    emitter.onNext(value)
                }

                override fun onError(t: Throwable?) {
                    emitter.onError(t!!)
                }

                override fun onCompleted() {
                    emitter.onComplete()
                }

            })
        }
    }
}

interface GRPC {
    //    val service: BrokerGrpc.BrokerStub
    fun robotSetup(request: com.tac.whitebox.Common.InitParams): Completable

    fun robotTeardown(request: com.tac.whitebox.Common.TeardownParams): Completable

    fun connect(request: Common.ConnectParams): Single<Common.Result>
}

@Component
class GRPCImpl(private val stub: BrokerGrpc.BrokerStub) : GRPC {
    override fun connect(request: Common.ConnectParams): Single<Common.Result> {
        return wrap(BrokerGrpc.BrokerStub::connect, stub, request).singleOrError()
    }

    override fun robotSetup(request: Common.InitParams): Completable {
        return wrap(BrokerGrpc.BrokerStub::robotSetup, stub, request).ignoreElements()
    }

    override fun robotTeardown(request: Common.TeardownParams): Completable {
        return wrap(BrokerGrpc.BrokerStub::robotTeardown, stub, request).ignoreElements()
    }
}

interface Robot {
    val account: String
}

data class DefaultRobot(override val account: String) : Robot

interface TestCase {
    fun start(robot: Robot): Observable<ActivityResult>
}

data class RobotActivityContext(val robot: Robot) : ActivityContext

class DefaultTestCase(private val activity: Activity) : TestCase {
    override fun start(robot: Robot): Observable<ActivityResult> {
        val ctx = RobotActivityContext(robot)
        return activity.proceed(ctx)
    }
}

interface TestCaseManager {
    fun findTestCase(id: String): Single<TestCase>
}

@Component
class LocalTestCaseManager(val activityFactory: ActivityFactory) : TestCaseManager {

    private val logger = LogFactory.getLog(this.javaClass)

    private val testCaseMap = mutableMapOf<String, TestCase>()
    private val fetchingTestCases = mutableMapOf<String, Single<TestCase>>()

    override fun findTestCase(id: String): Single<TestCase> {

        val tc = testCaseMap[id]
        if (tc != null) {
            return Single.just(tc)
        } else {
            val tcq = fetchingTestCases[id]
            if (tcq != null) {
                return tcq;
            } else {
                val q = Observable.create<TestCase> { emitter ->
                    // 从本地找名为id的xml并解析
                    logger.info("parse xml file ${id}.xml")

                    val xmlFile = File("../${id}.xml")
                    val doc = DocumentBuilderFactory.newDefaultInstance().newDocumentBuilder().parse(xmlFile)
                    doc.documentElement.normalize()

                    val t = doc.getElementsByTagName("template").item(0)

                    val act = activityFactory.create(t)

                    emitter.onNext(DefaultTestCase(act))
                }.publish().autoConnect().doOnNext {
                    testCaseMap[id] = it
                }


                return q.singleOrError()
            }
        }
    }

}

interface Job {
    fun start(grpc: GRPC): Observable<ActivityResult>
}

data class DefaultJob(val robot: Robot, val testCase: Single<TestCase>) : Job {

    companion object {
        val logger = LogFactory.getLog(DefaultJob::class.java)
    }

    override fun start(grpc: GRPC): Observable<ActivityResult> {
        val tcq = Observable.concat(setupRobot(grpc).toObservable(), testCase.toObservable())
        return tcq.flatMap { tc ->
            // 每收到一个job，调用它的start方法。在此之前要先setup
            tc.start(robot)
        }
    }

    fun setupRobot(grpc: GRPC): Completable {
        // 调用broker的grpc方法
        logger.info("setup robot")
        return grpc.robotSetup(Common.InitParams.newBuilder().setAccount(robot.account).build())
    }

    fun teardownRobot(grpc: GRPC): Completable {
        return grpc.robotTeardown(Common.TeardownParams.newBuilder().setAccount(robot.account).build())
    }
}

interface JobManager {
    fun start()
    fun addJob(job: Job)
}

@Component
class DefaultJobManager(val grpc: GRPC) : JobManager {
    private val logger = LogFactory.getLog(this.javaClass)

    override fun start() {
        jobs.subscribe({ job ->
            println("ready to start a job")
            job.start(grpc).subscribe({ r ->
                println("action done: ${r}")
            }, { err ->
                logger.error("job failed", err)
            }, {
                println("job done")
            })
        }, {}, {})
    }

    val jobs: Subject<Job> = PublishSubject.create()

    override fun addJob(job: Job) {
        jobs.onNext(job)
    }

}

interface JobTemplate {
    fun createJob(tcm: TestCaseManager): Job
}

data class DefaultJobTemplate(val account: String, val testCaseRef: String) : JobTemplate {
    override fun createJob(tcm: TestCaseManager): Job {
        val robot = DefaultRobot(account)
        val tc = tcm.findTestCase(testCaseRef)
        return DefaultJob(robot, tc)
    }
}

interface JobTemplateReceiver {
    fun getJobTemplates(): Observable<JobTemplate>
}

@Component
class DummyJobTemplateReceiver : JobTemplateReceiver {
    override fun getJobTemplates(): Observable<JobTemplate> {
        return Observable.just(DefaultJobTemplate("3400001", "demo"))
    }
}

@SpringBootApplication
@Component
@Profile("!test")
class Application : CommandLineRunner {

    @Value("\${target:127.0.0.1:12345}")
    private lateinit var target: String

    @Bean
    fun getBrokerStub(): BrokerGrpc.BrokerStub {
        val chan = ManagedChannelBuilder.forTarget(target).usePlaintext().build()
        return BrokerGrpc.newStub(chan)
    }

    @Autowired
    lateinit var jobTemplateReceiver: JobTemplateReceiver

    @Autowired
    lateinit var jobManager: JobManager

    @Autowired
    lateinit var testCaseManager: TestCaseManager

    override fun run(vararg args: String?) {
        println("running...")

        jobManager.start()

        jobTemplateReceiver.getJobTemplates().subscribe({ jt ->
            println("got a job template")
            val job = jt.createJob(testCaseManager)
            jobManager.addJob(job)
        }, { err ->
            error(err)
        })

//        val channel = ManagedChannelBuilder.forAddress("127.0.0.1", 12345).usePlaintext().build()
//        val stub = BrokerGrpc.newStub(channel)
//        val param = Common.ConnectParams.newBuilder().setAddress("172.17.100.100").setPort(31000).build()
//
//        wrap(BrokerGrpc.BrokerStub::connect, stub, param).subscribe({}, { err -> println(err) })

        Thread.sleep(100000)
    }
}

fun main(args: Array<String>) {
    runApplication<Application>(*args)
}
