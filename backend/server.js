const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 3000;


/* =====================================================
   START C PROGRAM IN API MODE
   ===================================================== */

const cProgram = spawn("./ecommerce.exe", ["api"]);


/* =====================================================
   RESPONSE MANAGEMENT
   ===================================================== */

let responseBuffer = "";
let pendingRequests = [];


/* =====================================================
   RECEIVE OUTPUT FROM C
   ===================================================== */

cProgram.stdout.on("data", (data) => {

    responseBuffer += data.toString();

    const lines =
        responseBuffer.split("\n");

    responseBuffer =
        lines.pop();

    lines.forEach((line) => {

        line = line.trim();

        if (line.length === 0) {
            return;
        }

        console.log(
            "C RAW RESPONSE:",
            line
        );

        const request =
            pendingRequests.shift();

        if (request) {

            try {

                const result =
                    JSON.parse(line);

                request.resolve(result);

            } catch (error) {

                request.reject(error);

            }

        }

    });

});


/* =====================================================
   C PROGRAM ERRORS
   ===================================================== */

cProgram.stderr.on("data", (data) => {

    console.error(
        "C ERROR:",
        data.toString()
    );

});


/* =====================================================
   C PROGRAM CLOSED
   ===================================================== */

cProgram.on("close", (code) => {

    console.log(
        `C program exited with code ${code}`
    );

});


/* =====================================================
   SEND COMMAND TO C
   ===================================================== */

function sendCommand(command) {

    return new Promise((resolve, reject) => {

        console.log(
            "COMMAND TO C:",
            command
        );

        pendingRequests.push({
            resolve,
            reject
        });

        cProgram.stdin.write(
            command + "\n"
        );

    });

}


/* =====================================================
   HOME
   ===================================================== */

app.get("/", (req, res) => {

    res.json({
        success: true,
        message:
            "E-Commerce Order Management API is running!"
    });

});


/* =====================================================
   GET ALL PRODUCTS
   ===================================================== */

app.get(
    "/api/products",
    async (req, res) => {

        try {

            const result =
                await sendCommand(
                    "VIEW_PRODUCTS"
                );

            res.json(result);

        } catch (error) {

            console.error(
                "PRODUCT ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to fetch products"
            });

        }

    }
);


/* =====================================================
   SEARCH PRODUCT
   ===================================================== */

app.get(
    "/api/products/:id",
    async (req, res) => {

        try {

            const productID =
                Number(req.params.id);

            const result =
                await sendCommand(
                    `SEARCH|${productID}`
                );

            res.json(result);

        } catch (error) {

            console.error(
                "SEARCH ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Product search failed"
            });

        }

    }
);


/* =====================================================
   PLACE ORDER
   ===================================================== */

app.post(
    "/api/orders",
    async (req, res) => {

        try {

            console.log(
                "ORDER REQUEST:",
                req.body
            );


            const productID =
                Number(
                    req.body.productID
                );

            const quantity =
                Number(
                    req.body.quantity
                );


            if (
                !Number.isInteger(productID) ||
                !Number.isInteger(quantity)
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "productID and quantity must be numbers"
                });

            }


            const result =
                await sendCommand(
                    `PLACE_ORDER|${productID}|${quantity}`
                );


            console.log(
                "ORDER RESPONSE:",
                result
            );


            res.json(result);

        } catch (error) {

            console.error(
                "ORDER ERROR:",
                error
            );


            res.status(500).json({
                success: false,
                message:
                    "Failed to place order",
                error:
                    error.message
            });

        }

    }
);


/* =====================================================
   VIEW ORDER QUEUE
   ===================================================== */

app.get(
    "/api/orders",
    async (req, res) => {

        try {

            const result =
                await sendCommand(
                    "VIEW_QUEUE"
                );

            res.json(result);

        } catch (error) {

            console.error(
                "QUEUE ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to fetch orders"
            });

        }

    }
);


/* =====================================================
   PROCESS NEXT ORDER
   ===================================================== */

app.post(
    "/api/orders/process",
    async (req, res) => {

        try {

            const result =
                await sendCommand(
                    "PROCESS_ORDER"
                );

            res.json(result);

        } catch (error) {

            console.error(
                "PROCESS ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to process order"
            });

        }

    }
);


/* =====================================================
   EDIT ORDER
   ===================================================== */

app.put(
    "/api/orders/:id",
    async (req, res) => {

        try {

            const orderID =
                Number(req.params.id);

            const quantity =
                Number(req.body.quantity);


            const result =
                await sendCommand(
                    `EDIT_ORDER|${orderID}|${quantity}`
                );


            res.json(result);

        } catch (error) {

            console.error(
                "EDIT ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to edit order"
            });

        }

    }
);


/* =====================================================
   CANCEL ORDER
   ===================================================== */

app.delete(
    "/api/orders/:id",
    async (req, res) => {

        try {

            const orderID =
                Number(req.params.id);


            const result =
                await sendCommand(
                    `CANCEL_ORDER|${orderID}`
                );


            res.json(result);

        } catch (error) {

            console.error(
                "CANCEL ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to cancel order"
            });

        }

    }
);


/* =====================================================
   UNDO LAST ACTION
   ===================================================== */

app.post(
    "/api/undo",
    async (req, res) => {

        try {

            const result =
                await sendCommand(
                    "UNDO"
                );


            res.json(result);

        } catch (error) {

            console.error(
                "UNDO ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Undo failed"
            });

        }

    }
);


/* =====================================================
   ORDER HISTORY
   ===================================================== */

app.get(
    "/api/history",
    async (req, res) => {

        try {

            const result =
                await sendCommand(
                    "VIEW_HISTORY"
                );


            res.json(result);

        } catch (error) {

            console.error(
                "HISTORY ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to fetch order history"
            });

        }

    }
);


/* =====================================================
   START SERVER
   ===================================================== */

app.listen(
    PORT,
    () => {

        console.log(
            `Server running at http://localhost:${PORT}`
        );

        console.log(
            "C DSA engine started in API mode."
        );

    }
);