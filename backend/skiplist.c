#include <stdlib.h>
#include <string.h>
#include <time.h>

#include "skiplist.h"

/* Coin flip per lane: each extra lane has a 50% chance */
static int randomLevel(void)
{
    int level = 0;

    while (level < SKIPLIST_MAX_LEVEL - 1 && (rand() & 1))
    {
        level++;
    }

    return level;
}

static struct Product *makeNode(int level, int id, const char *name,
                                float price, int stock)
{
    struct Product *node = (struct Product *)calloc(1, sizeof(struct Product));

    if (node == NULL)
    {
        return NULL;
    }

    node->productID = id;
    strncpy(node->name, name, sizeof(node->name) - 1);
    node->price = price;
    node->stock = stock;
    node->level = level;

    return node;
}

void initSkipList(struct SkipList *list)
{
    srand((unsigned)time(NULL));

    list->header = makeNode(SKIPLIST_MAX_LEVEL - 1, 0, "", 0, 0);
    list->level = 0;
    list->size = 0;
}

struct Product *skipInsert(struct SkipList *list, int productID,
                           const char *name, float price, int stock)
{
    struct Product *update[SKIPLIST_MAX_LEVEL];
    struct Product *current = list->header;
    struct Product *node;
    int level;
    int i;

    /* Walk from the top lane down, remembering where we turned down */
    for (i = list->level; i >= 0; i--)
    {
        while (current->forward[i] != NULL &&
               current->forward[i]->productID < productID)
        {
            current = current->forward[i];
        }

        update[i] = current;
    }

    current = current->forward[0];

    if (current != NULL && current->productID == productID)
    {
        return NULL;
    }

    level = randomLevel();

    if (level > list->level)
    {
        for (i = list->level + 1; i <= level; i++)
        {
            update[i] = list->header;
        }

        list->level = level;
    }

    node = makeNode(level, productID, name, price, stock);

    if (node == NULL)
    {
        return NULL;
    }

    for (i = 0; i <= level; i++)
    {
        node->forward[i] = update[i]->forward[i];
        update[i]->forward[i] = node;
    }

    list->size++;

    return node;
}

struct Product *skipSearch(struct SkipList *list, int productID, int *steps)
{
    struct Product *current = list->header;
    int comparisons = 0;
    int i;

    for (i = list->level; i >= 0; i--)
    {
        while (current->forward[i] != NULL)
        {
            comparisons++;

            if (current->forward[i]->productID < productID)
            {
                current = current->forward[i];
            }
            else
            {
                break;
            }
        }
    }

    current = current->forward[0];

    if (current != NULL)
    {
        comparisons++;
    }

    if (steps != NULL)
    {
        *steps = comparisons;
    }

    if (current != NULL && current->productID == productID)
    {
        return current;
    }

    return NULL;
}

void freeSkipList(struct SkipList *list)
{
    struct Product *current = list->header;
    struct Product *next;

    while (current != NULL)
    {
        next = current->forward[0];
        free(current);
        current = next;
    }

    list->header = NULL;
    list->level = 0;
    list->size = 0;
}