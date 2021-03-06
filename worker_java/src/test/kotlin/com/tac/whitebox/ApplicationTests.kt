package com.tac.whitebox

import org.junit.Test
import org.junit.runner.RunWith
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.junit4.SpringRunner

@RunWith(SpringRunner::class)
@ActiveProfiles("test")
@SpringBootTest
class ApplicationTests {

    @Test
    fun contextLoads() {
    }

    @Test
    fun testEchoActivity() {
        val ea = EchoActivity("hello")
        val r = ea.proceed().blockingGet()
        assert(r == null)
    }
}
