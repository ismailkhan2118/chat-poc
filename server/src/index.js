import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import amqp from "amqplib";
import { log } from "console";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: '*' });

let queueName = '';
const exchange = 'chats';


io.use((socket, next) => {
    let session = socket.handshake.auth.session;
    console.log(session);

    if (session) {
        next();
    }
    else {
        throw (new Error("Unauthorized"));
    }
})


io.on("disconnect", (m) => {
    console.log("disconnected");

});


//===RMQ PRODUCER & CONSUMER
amqp.connect('amqp://localhost').then((conn) => {
    console.log("Queue connected successfully");
    publisher(conn);
    // consumer(conn);
    // let channel = await conn.createChannel();
    // channel.assertQueue('', {})

})
    .catch(err => {
        console.log(err);
    })

function bail(err) {
    console.error(err);
    process.exit(1);
}

// Publisher
async function publisher(conn) {
    try {
        let channel = await conn.createChannel(); // creates a channel

        await channel.assertExchange(exchange, 'fanout', {
            durable: false
        });

        let queue = await channel.assertQueue('', { exclusive: true }); // asserts the queue exists
        console.log(queue);

        await channel.bindQueue(queue.queue, exchange, '');


        // sends a message to the queue
        await channel.publish(exchange, '', Buffer.from("Initial Message from Server A"));

        queueName = queue.queue;


        // Consumer
        channel.consume(queueName, async function (msg) { //consumes the queue
            if (msg !== null) {
                //insert to db and return with message id with is_read->0
                console.log('message received from queue ', msg.content.toString()); // writes the received message to the console


                try {
                    let message = JSON.parse(msg.content.toString());
                    if (message?.type == 'chat') {
                        console.log('message received from chat queue ', message); // writes the received message to the console
                        channel.ack(msg); // acknowledge that the message was received

                        let socketsList = await io.fetchSockets();

                        //find if client is connected
                        console.log(socketsList.map(s => s.data));
                        for (let socket of socketsList) {
                            if (socket.handshake.auth.session == message.sendTo) {
                                io.to(socket.id).emit('message', message);
                                console.log(`Message sent to ${socket.handshake.auth.session}`);
                            }
                        }
                    }
                }
                catch (err) {

                    channel.ack(msg); // acknowledge that the message was received

                }

            }

        });


        io.on("connection", (socket) => {

            console.log("Client connected ", socket.id);
            socket.on('message', async (m) => {
                console.log("message received from client", m)

                await channel.publish(exchange, '', Buffer.from(JSON.stringify(m)));

            })
            // socket.on('read', (m) => {
            //     console.log("message received from ", m)
            //     //update is_read in db

            //     let from = m.from;
            //     let to = m.sendTo;

            //     // await io.fetchSockets()
            // })
        });


    }
    catch (err) {
        console.log(err);
    }
}





httpServer.listen(process.argv[2] || 3000, () => {
    console.log(`Server listening on port ${process.argv[2] || 3000}`);
});

// let channel = await ampqplib.connect("localhost:5672");
// channel.
