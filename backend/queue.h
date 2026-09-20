#ifndef QUEUE_H
#define QUEUE_H


/* ==========================================
   ORDER STRUCTURE
   ========================================== */

struct Order
{
    int orderID;

    int productID;

    int quantity;

    float totalAmount;

    char status[20];
};


/* ==========================================
   QUEUE NODE
   ========================================== */

struct QueueNode
{
    struct Order order;

    struct QueueNode *next;
};


/* ==========================================
   QUEUE
   ========================================== */

struct Queue
{
    struct QueueNode *front;

    struct QueueNode *rear;
};


/* ==========================================
   QUEUE FUNCTIONS
   ========================================== */

void initializeQueue(
    struct Queue *queue
);


void enqueue(
    struct Queue *queue,
    struct Order order
);


void dequeue(
    struct Queue *queue
);


void displayQueue(
    struct Queue *queue
);


int isQueueEmpty(
    struct Queue *queue
);


/* ==========================================
   FIND ORDER
   ========================================== */

struct QueueNode* findOrder(
    struct Queue *queue,
    int orderID
);
void cancelOrder(
    struct Queue *queue,
    int orderID
);

#endif