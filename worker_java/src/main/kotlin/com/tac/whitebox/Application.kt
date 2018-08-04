package com.tac.whitebox

import io.grpc.stub.StreamObserver
import io.reactivex.Observable
import io.reactivex.Single
import io.reactivex.subjects.PublishSubject
import io.reactivex.subjects.Subject
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.CommandLineRunner
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.stereotype.Component

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

interface Robot

data class DefaultRobot(val account: String) : Robot

interface TestCase

interface TestCaseManager {
    fun findTestCase(id: String): Single<TestCase>
}

@Component
class DefaultTestCaseManager : TestCaseManager {
    override fun findTestCase(id: String): Single<TestCase> {
        return Single.error(RuntimeException("no impl"))
    }

}

interface ActionResult

interface Job {
    fun start(): Observable<ActionResult>
}

data class DefaultJob(val robot: Robot, val testCase: Single<TestCase>) : Job {
    override fun start(): Observable<ActionResult> {
        return Observable.error(NotImplementedError()) //To change body of created functions use File | Settings | File Templates.
    }
}

interface JobManager {
    fun start()
    fun addJob(job: Job)
}

@Component
class DefaultJobManager : JobManager {
    override fun start() {
        jobs.subscribe({ job ->
            println("ready to start a job")
            job.start().subscribe({ r ->
                println("action done: ${r}")
            }, { err ->
                println("job failed: ${err}")
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
class Application : CommandLineRunner {

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
