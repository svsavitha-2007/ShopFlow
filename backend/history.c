#include <stdio.h>
#include <stdlib.h>

#include "history.h"


void initializeHistory(
    struct OrderHistory *history)
{
    history->head = NULL;
    history->tail = NULL;
}


int isHistoryEmpty(
    struct OrderHistory *history)
{
    if (history->head == NULL)
    {
        return 1;
    }

    return 0;
}


void addToHistory(
    struct OrderHistory *history,
    struct Order order)
{
    struct HistoryNode *newNode;


    newNode =
        (struct HistoryNode*)
        malloc(sizeof(struct HistoryNode));


    if (newNode == NULL)
    {
        printf(
            "Memory allocation failed!\n"
        );

        return;
    }


    newNode->order = order;
    newNode->next = NULL;


    if (history->tail == NULL)
    {
        history->head = newNode;
        history->tail = newNode;
    }
    else
    {
        history->tail->next = newNode;
        history->tail = newNode;
    }
}


void displayHistory(
    struct OrderHistory *history)
{
    struct HistoryNode *current;


    if (isHistoryEmpty(history))
    {
        printf(
            "\nNo processed orders yet.\n"
        );

        return;
    }


    current = history->head;


    printf("\n");
    printf("====================================\n");
    printf("          ORDER HISTORY\n");
    printf("====================================\n");


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


        current = current->next;
    }
}


void freeHistory(
    struct OrderHistory *history)
{
    struct HistoryNode *current;
    struct HistoryNode *temp;


    current = history->head;


    while (current != NULL)
    {
        temp = current;

        current = current->next;

        free(temp);
    }


    history->head = NULL;
    history->tail = NULL;
}