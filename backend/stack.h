#ifndef STACK_H
#define STACK_H


struct OrderAction
{
    int orderID;

    char actionType[30];

    int productID;

    int oldQuantity;
    int newQuantity;

    float oldAmount;
    float newAmount;

    int oldStock;
    int newStock;
};


struct StackNode
{
    struct OrderAction action;

    struct StackNode *next;
};


struct Stack
{
    struct StackNode *top;
};


void initializeStack(
    struct Stack *stack
);


void push(
    struct Stack *stack,
    struct OrderAction action
);


void pop(
    struct Stack *stack
);


void displayStack(
    struct Stack *stack
);


int isStackEmpty(
    struct Stack *stack
);


#endif