#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "queue.h"


/* ==========================================
   INITIALIZE QUEUE
   ========================================== */

void initializeQueue(
    struct Queue *queue)
{
    queue->front = NULL;

    queue->rear = NULL;
}


/* ==========================================
   CHECK WHETHER QUEUE IS EMPTY
   ========================================== */

int isQueueEmpty(
    struct Queue *queue)
{
    if (queue->front == NULL)
    {
        return 1;
    }

    return 0;
}


/* ==========================================
   ENQUEUE
   ========================================== */

void enqueue(
    struct Queue *queue,
    struct Order order)
{
    struct QueueNode *newNode;


    newNode =
        (struct QueueNode*)
        malloc(sizeof(struct QueueNode));


    if (newNode == NULL)
    {
        printf("Memory allocation failed!\n");

        return;
    }


    /* Store order */

    newNode->order = order;

    newNode->next = NULL;


    /* Add Pending status */

    strcpy(
        newNode->order.status,
        "Pending"
    );


    /* If queue is empty */

    if (queue->rear == NULL)
    {
        queue->front = newNode;

        queue->rear = newNode;
    }

    else
    {
        queue->rear->next = newNode;

        queue->rear = newNode;
    }

}


/* ==========================================
   DEQUEUE / PROCESS NEXT ORDER
   ========================================== */

void dequeue(
    struct Queue *queue)
{
    struct QueueNode *temp;

    if (isQueueEmpty(queue))
    {
        return;
    }

    temp = queue->front;

    queue->front =
        queue->front->next;

    if (queue->front == NULL)
    {
        queue->rear = NULL;
    }

    free(temp);
}


/* ==========================================
   DISPLAY QUEUE
   ========================================== */

void displayQueue(
    struct Queue *queue)
{
    struct QueueNode *current;


    if (isQueueEmpty(queue))
    {
        printf(
            "\nNo pending orders.\n"
        );

        return;
    }


    current = queue->front;


    printf("\n");
    printf("====================================\n");
    printf("            ORDER QUEUE\n");
    printf("====================================\n");


    printf("\nFRONT\n");


    while (current != NULL)
    {
        printf(
            "Order %d | Product %d | Quantity %d | Amount %.2f | Status: %s\n",
            current->order.orderID,
            current->order.productID,
            current->order.quantity,
            current->order.totalAmount,
            current->order.status
        );


        current =
            current->next;
    }


    printf("\nREAR\n");
}


/* ==========================================
   FIND ORDER
   ========================================== */

struct QueueNode* findOrder(
    struct Queue *queue,
    int orderID)
{
    struct QueueNode *current;


    current =
        queue->front;


    while (current != NULL)
    {
        if (
            current->order.orderID
            ==
            orderID
        )
        {
            return current;
        }


        current =
            current->next;
    }


    return NULL;
}
/* ==========================================
   CANCEL ORDER
   ========================================== */

void cancelOrder(
    struct Queue *queue,
    int orderID)
{
    struct QueueNode *current;
    struct QueueNode *previous;


    current = queue->front;
    previous = NULL;


    while (current != NULL)
    {
        if (current->order.orderID == orderID)
        {
            /* If order is at FRONT */

            if (previous == NULL)
            {
                queue->front =
                    current->next;
            }

            else
            {
                previous->next =
                    current->next;
            }


            /* If order is REAR */

            if (current == queue->rear)
            {
                queue->rear = previous;
            }


            free(current);

            return;
        }


        previous = current;

        current = current->next;
    }
}