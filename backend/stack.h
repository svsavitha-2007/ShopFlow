#ifndef STACK_H
#define STACK_H

/* One undoable change. Everything needed to reverse it is stored here. */
struct OrderAction
{
    int orderID;
    char actionType[30];       /* "Quantity Changed" | "Order Cancelled" | "Priority Changed" */
    int productID;

    int oldQuantity;
    int newQuantity;

    float oldAmount;
    float newAmount;

    int oldPriority;
    int newPriority;

    unsigned long sequence;    /* keeps the original queue position when a cancel is undone */
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

void initializeStack(struct Stack *stack);
int  isStackEmpty(const struct Stack *stack);
int  push(struct Stack *stack, struct OrderAction action);
void pop(struct Stack *stack);
void freeStack(struct Stack *stack);

#endif