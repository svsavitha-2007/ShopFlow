#include <stdlib.h>

#include "stack.h"

void initializeStack(struct Stack *stack)
{
    stack->top = NULL;
}

int isStackEmpty(const struct Stack *stack)
{
    return stack->top == NULL;
}

int push(struct Stack *stack, struct OrderAction action)
{
    struct StackNode *node = (struct StackNode *)malloc(sizeof(struct StackNode));

    if (node == NULL)
    {
        return 0;
    }

    node->action = action;
    node->next = stack->top;
    stack->top = node;

    return 1;
}

void pop(struct Stack *stack)
{
    struct StackNode *temp;

    if (stack->top == NULL)
    {
        return;
    }

    temp = stack->top;
    stack->top = temp->next;
    free(temp);
}

void freeStack(struct Stack *stack)
{
    while (!isStackEmpty(stack))
    {
        pop(stack);
    }
}