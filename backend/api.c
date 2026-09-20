#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "api.h"
#include "bst.h"
#include "queue.h"
#include "stack.h"
#include "history.h"


/* =========================================================
   E-COMMERCE SYSTEM STATE
   ========================================================= */

struct EcommerceSystem
{
    struct Product *productRoot;

    struct Queue orderQueue;

    struct Stack undoStack;

    struct OrderHistory orderHistory;

    int nextOrderID;
};


/* =========================================================
   INITIALIZE SYSTEM
   ========================================================= */

void initializeSystem(struct EcommerceSystem *system)
{
    system->productRoot = NULL;

    initializeQueue(&system->orderQueue);

    initializeStack(&system->undoStack);

    initializeHistory(&system->orderHistory);

    system->nextOrderID = 1001;


    /* Default products */

    system->productRoot = insertProduct(
        system->productRoot,
        101,
        "Smartphone",
        30000,
        15
    );

    system->productRoot = insertProduct(
        system->productRoot,
        103,
        "Keyboard",
        1500,
        20
    );

    system->productRoot = insertProduct(
        system->productRoot,
        105,
        "Laptop",
        65000,
        10
    );

    system->productRoot = insertProduct(
        system->productRoot,
        108,
        "Smartwatch",
        5000,
        12
    );

    system->productRoot = insertProduct(
        system->productRoot,
        110,
        "Headphones",
        2500,
        25
    );
}


/* =========================================================
   SEARCH PRODUCT
   ========================================================= */

void apiSearchProduct(
    struct EcommerceSystem *system,
    int productID)
{
    struct Product *product;

    product = searchProduct(
        system->productRoot,
        productID
    );

    if (product == NULL)
    {
        printf(
            "{\"success\":false,\"message\":\"Product not found\"}\n"
        );

        fflush(stdout);

        return;
    }

    printf(
        "{\"success\":true,\"product\":{\"id\":%d,\"name\":\"%s\",\"price\":%.2f,\"stock\":%d}}\n",
        product->productID,
        product->name,
        product->price,
        product->stock
    );

    fflush(stdout);
}


/* =========================================================
   VIEW PRODUCTS
   ========================================================= */

void apiViewProducts(
    struct EcommerceSystem *system)
{
    struct Product *current;
    int first = 1;

    printf(
        "{\"success\":true,\"products\":["
    );

    /*
       In-order BST traversal.
       This displays products in sorted
       order of product ID.
    */

    /*
       Stack-based traversal is used here
       so that we do not need another
       nested function.
    */

    struct Product *stack[100];
    int top = -1;

    current = system->productRoot;

    while (current != NULL || top >= 0)
    {
        while (current != NULL)
        {
            stack[++top] = current;
            current = current->left;
        }

        current = stack[top--];

        if (!first)
        {
            printf(",");
        }

        printf(
            "{\"id\":%d,\"name\":\"%s\",\"price\":%.2f,\"stock\":%d}",
            current->productID,
            current->name,
            current->price,
            current->stock
        );

        first = 0;

        current = current->right;
    }

    printf("]}\n");

    fflush(stdout);
}


/* =========================================================
   PLACE ORDER
   ========================================================= */

void apiPlaceOrder(
    struct EcommerceSystem *system,
    int productID,
    int quantity)
{
    struct Product *product;

    product = searchProduct(
        system->productRoot,
        productID
    );

    if (product == NULL)
    {
        printf(
            "{\"success\":false,\"message\":\"Product not found\"}\n"
        );

        fflush(stdout);

        return;
    }

    if (quantity <= 0)
    {
        printf(
            "{\"success\":false,\"message\":\"Invalid quantity\"}\n"
        );

        fflush(stdout);

        return;
    }

    if (quantity > product->stock)
    {
        printf(
            "{\"success\":false,\"message\":\"Insufficient stock\"}\n"
        );

        fflush(stdout);

        return;
    }


    struct Order order;

    order.orderID = system->nextOrderID++;

    order.productID = productID;

    order.quantity = quantity;

    order.totalAmount =
        product->price * quantity;

    strcpy(
        order.status,
        "Pending"
    );


    enqueue(
        &system->orderQueue,
        order
    );


    product->stock -= quantity;


    /*
       IMPORTANT:
       The enqueue() function must NOT print
       anything when the C program is being
       used in API mode.

       Only this JSON response should be
       sent to Node.js.
    */

    printf(
        "{\"success\":true,\"message\":\"Order placed successfully\",\"order\":{\"id\":%d,\"productID\":%d,\"quantity\":%d,\"amount\":%.2f,\"status\":\"Pending\"}}\n",
        order.orderID,
        order.productID,
        order.quantity,
        order.totalAmount
    );

    fflush(stdout);
}


/* =========================================================
   VIEW QUEUE
   ========================================================= */

void apiViewQueue(
    struct EcommerceSystem *system)
{
    struct QueueNode *current;

    current = system->orderQueue.front;

    printf(
        "{\"success\":true,\"orders\":["
    );

    int first = 1;

    while (current != NULL)
    {
        if (!first)
        {
            printf(",");
        }

        printf(
            "{\"id\":%d,\"productID\":%d,\"quantity\":%d,\"amount\":%.2f,\"status\":\"%s\"}",
            current->order.orderID,
            current->order.productID,
            current->order.quantity,
            current->order.totalAmount,
            current->order.status
        );

        first = 0;

        current = current->next;
    }

    printf("]}\n");

    fflush(stdout);
}


/* =========================================================
   PROCESS NEXT ORDER
   ========================================================= */

void apiProcessOrder(
    struct EcommerceSystem *system)
{
    if (isQueueEmpty(&system->orderQueue))
    {
        printf(
            "{\"success\":false,\"message\":\"No pending orders\"}\n"
        );

        fflush(stdout);

        return;
    }


    struct Order processedOrder;

    processedOrder =
        system->orderQueue.front->order;

    strcpy(
        processedOrder.status,
        "Processed"
    );


    addToHistory(
        &system->orderHistory,
        processedOrder
    );


    dequeue(
        &system->orderQueue
    );


    printf(
        "{\"success\":true,\"message\":\"Order processed successfully\",\"order\":{\"id\":%d,\"productID\":%d,\"quantity\":%d,\"amount\":%.2f,\"status\":\"Processed\"}}\n",
        processedOrder.orderID,
        processedOrder.productID,
        processedOrder.quantity,
        processedOrder.totalAmount
    );

    fflush(stdout);
}


/* =========================================================
   EDIT ORDER
   ========================================================= */

void apiEditOrder(
    struct EcommerceSystem *system,
    int orderID,
    int newQuantity)
{
    struct QueueNode *node;

    node = findOrder(
        &system->orderQueue,
        orderID
    );

    if (node == NULL)
    {
        printf(
            "{\"success\":false,\"message\":\"Pending order not found\"}\n"
        );

        fflush(stdout);

        return;
    }


    struct Product *product;

    product = searchProduct(
        system->productRoot,
        node->order.productID
    );

    if (product == NULL)
    {
        printf(
            "{\"success\":false,\"message\":\"Product not found\"}\n"
        );

        fflush(stdout);

        return;
    }


    if (newQuantity <= 0)
    {
        printf(
            "{\"success\":false,\"message\":\"Invalid quantity\"}\n"
        );

        fflush(stdout);

        return;
    }


    int difference =
        newQuantity - node->order.quantity;


    if (difference > 0 &&
        difference > product->stock)
    {
        printf(
            "{\"success\":false,\"message\":\"Insufficient stock for quantity increase\"}\n"
        );

        fflush(stdout);

        return;
    }


    struct OrderAction action;

    action.orderID = orderID;

    strcpy(
        action.actionType,
        "Quantity Changed"
    );

    action.productID =
        node->order.productID;

    action.oldQuantity =
        node->order.quantity;

    action.newQuantity =
        newQuantity;

    action.oldAmount =
        node->order.totalAmount;

    action.newAmount =
        product->price * newQuantity;

    action.oldStock =
        product->stock;

    action.newStock =
        product->stock - difference;


    push(
        &system->undoStack,
        action
    );


    product->stock -= difference;

    node->order.quantity =
        newQuantity;

    node->order.totalAmount =
        product->price * newQuantity;


    printf(
        "{\"success\":true,\"message\":\"Order updated successfully\",\"order\":{\"id\":%d,\"quantity\":%d,\"amount\":%.2f}}\n",
        orderID,
        newQuantity,
        node->order.totalAmount
    );

    fflush(stdout);
}


/* =========================================================
   CANCEL ORDER
   ========================================================= */

void apiCancelOrder(
    struct EcommerceSystem *system,
    int orderID)
{
    struct QueueNode *node;

    node = findOrder(
        &system->orderQueue,
        orderID
    );

    if (node == NULL)
    {
        printf(
            "{\"success\":false,\"message\":\"Pending order not found\"}\n"
        );

        fflush(stdout);

        return;
    }


    struct Product *product;

    product = searchProduct(
        system->productRoot,
        node->order.productID
    );

    if (product == NULL)
    {
        printf(
            "{\"success\":false,\"message\":\"Product not found\"}\n"
        );

        fflush(stdout);

        return;
    }


    struct OrderAction action;

    action.orderID = orderID;

    strcpy(
        action.actionType,
        "Order Cancelled"
    );

    action.productID =
        node->order.productID;

    action.oldQuantity =
        node->order.quantity;

    action.newQuantity = 0;

    action.oldAmount =
        node->order.totalAmount;

    action.newAmount = 0;

    action.oldStock =
        product->stock;

    action.newStock =
        product->stock + node->order.quantity;


    push(
        &system->undoStack,
        action
    );


    product->stock +=
        node->order.quantity;


    cancelOrder(
        &system->orderQueue,
        orderID
    );


    printf(
        "{\"success\":true,\"message\":\"Order cancelled successfully\",\"orderID\":%d}\n",
        orderID
    );

    fflush(stdout);
}


/* =========================================================
   UNDO
   ========================================================= */

void apiUndo(
    struct EcommerceSystem *system)
{
    if (isStackEmpty(
            &system->undoStack))
    {
        printf(
            "{\"success\":false,\"message\":\"Nothing to undo\"}\n"
        );

        fflush(stdout);

        return;
    }


    struct OrderAction action;

    action =
        system->undoStack.top->action;


    if (strcmp(
            action.actionType,
            "Quantity Changed") == 0)
    {
        struct QueueNode *node;

        node = findOrder(
            &system->orderQueue,
            action.orderID
        );

        if (node != NULL)
        {
            struct Product *product;

            product = searchProduct(
                system->productRoot,
                action.productID
            );

            if (product != NULL)
            {
                node->order.quantity =
                    action.oldQuantity;

                node->order.totalAmount =
                    action.oldAmount;

                product->stock =
                    action.oldStock;
            }
        }
    }


    else if (
        strcmp(
            action.actionType,
            "Order Cancelled"
        ) == 0)
    {
        struct Order order;

        order.orderID =
            action.orderID;

        order.productID =
            action.productID;

        order.quantity =
            action.oldQuantity;

        order.totalAmount =
            action.oldAmount;

        strcpy(
            order.status,
            "Pending"
        );


        enqueue(
            &system->orderQueue,
            order
        );


        struct Product *product;

        product = searchProduct(
            system->productRoot,
            action.productID
        );

        if (product != NULL)
        {
            product->stock =
                action.oldStock;
        }
    }


    pop(
        &system->undoStack
    );


    printf(
        "{\"success\":true,\"message\":\"Last action undone\",\"action\":\"%s\",\"orderID\":%d}\n",
        action.actionType,
        action.orderID
    );

    fflush(stdout);
}


/* =========================================================
   ORDER HISTORY
   ========================================================= */

void apiViewHistory(
    struct EcommerceSystem *system)
{
    struct HistoryNode *current;

    current =
        system->orderHistory.head;

    printf(
        "{\"success\":true,\"orders\":["
    );

    int first = 1;

    while (current != NULL)
    {
        if (!first)
        {
            printf(",");
        }

        printf(
            "{\"id\":%d,\"productID\":%d,\"quantity\":%d,\"amount\":%.2f,\"status\":\"%s\"}",
            current->order.orderID,
            current->order.productID,
            current->order.quantity,
            current->order.totalAmount,
            current->order.status
        );

        first = 0;

        current = current->next;
    }

    printf("]}\n");

    fflush(stdout);
}


/* =========================================================
   COMMAND PROCESSOR
   ========================================================= */

void processCommand(
    struct EcommerceSystem *system,
    char *command)
{
    char *operation;

    operation =
        strtok(command, "|");


    if (operation == NULL)
    {
        printf(
            "{\"success\":false,\"message\":\"Invalid command\"}\n"
        );

        fflush(stdout);

        return;
    }


    /* SEARCH */

    if (strcmp(operation, "SEARCH") == 0)
    {
        char *idText;

        idText =
            strtok(NULL, "|");

        if (idText == NULL)
        {
            printf(
                "{\"success\":false,\"message\":\"Product ID required\"}\n"
            );

            fflush(stdout);

            return;
        }

        apiSearchProduct(
            system,
            atoi(idText)
        );

        return;
    }


    /* PRODUCTS */

    if (strcmp(operation, "VIEW_PRODUCTS") == 0)
    {
        apiViewProducts(system);

        return;
    }


    /* PLACE ORDER */

    if (strcmp(operation, "PLACE_ORDER") == 0)
    {
        char *productText;
        char *quantityText;

        productText =
            strtok(NULL, "|");

        quantityText =
            strtok(NULL, "|");


        if (productText == NULL ||
            quantityText == NULL)
        {
            printf(
                "{\"success\":false,\"message\":\"Product ID and quantity required\"}\n"
            );

            fflush(stdout);

            return;
        }


        apiPlaceOrder(
            system,
            atoi(productText),
            atoi(quantityText)
        );

        return;
    }


    /* VIEW QUEUE */

    if (strcmp(operation, "VIEW_QUEUE") == 0)
    {
        apiViewQueue(system);

        return;
    }


    /* PROCESS */

    if (strcmp(operation, "PROCESS_ORDER") == 0)
    {
        apiProcessOrder(system);

        return;
    }


    /* EDIT */

    if (strcmp(operation, "EDIT_ORDER") == 0)
    {
        char *orderText;
        char *quantityText;

        orderText =
            strtok(NULL, "|");

        quantityText =
            strtok(NULL, "|");


        if (orderText == NULL ||
            quantityText == NULL)
        {
            printf(
                "{\"success\":false,\"message\":\"Order ID and quantity required\"}\n"
            );

            fflush(stdout);

            return;
        }


        apiEditOrder(
            system,
            atoi(orderText),
            atoi(quantityText)
        );

        return;
    }


    /* CANCEL */

    if (strcmp(operation, "CANCEL_ORDER") == 0)
    {
        char *orderText;

        orderText =
            strtok(NULL, "|");


        if (orderText == NULL)
        {
            printf(
                "{\"success\":false,\"message\":\"Order ID required\"}\n"
            );

            fflush(stdout);

            return;
        }


        apiCancelOrder(
            system,
            atoi(orderText)
        );

        return;
    }


    /* UNDO */

    if (strcmp(operation, "UNDO") == 0)
    {
        apiUndo(system);

        return;
    }


    /* HISTORY */

    if (strcmp(operation, "VIEW_HISTORY") == 0)
    {
        apiViewHistory(system);

        return;
    }


    /* EXIT */

    if (strcmp(operation, "EXIT") == 0)
    {
        printf(
            "{\"success\":true,\"message\":\"C API shutting down\"}\n"
        );

        fflush(stdout);

        return;
    }


    /* UNKNOWN COMMAND */

    printf(
        "{\"success\":false,\"message\":\"Unknown command\"}\n"
    );

    fflush(stdout);
}


/* =========================================================
   API MODE
   ========================================================= */

void runApiMode(void)
{
    struct EcommerceSystem system;

    char command[500];


    initializeSystem(&system);


    /*
       IMPORTANT:
       API mode must produce ONLY JSON output.
    */

    while (
        fgets(
            command,
            sizeof(command),
            stdin
        ) != NULL)
    {
        command[
            strcspn(
                command,
                "\r\n"
            )
        ] = '\0';


        if (strcmp(command, "EXIT") == 0)
        {
            processCommand(
                &system,
                command
            );

            break;
        }


        processCommand(
            &system,
            command
        );
    }


    freeHistory(
        &system.orderHistory
    );
}