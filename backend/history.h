#ifndef HISTORY_H
#define HISTORY_H


#include "queue.h"

struct HistoryNode
{
    struct Order order;

    struct HistoryNode *next;
};


struct OrderHistory
{
    struct HistoryNode *head;

    struct HistoryNode *tail;
};


void initializeHistory(
    struct OrderHistory *history
);


void addToHistory(
    struct OrderHistory *history,
    struct Order order
);


void displayHistory(
    struct OrderHistory *history
);


int isHistoryEmpty(
    struct OrderHistory *history
);


void freeHistory(
    struct OrderHistory *history
);


#endif