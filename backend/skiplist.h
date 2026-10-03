#ifndef SKIPLIST_H
#define SKIPLIST_H

#define SKIPLIST_MAX_LEVEL 8

/* A product is one skip-list node. forward[i] is the next node on lane i. */
struct Product
{
    int productID;
    char name[50];
    float price;
    int stock;

    int level;                                   /* highest lane this node is on */
    struct Product *forward[SKIPLIST_MAX_LEVEL];
};

struct SkipList
{
    struct Product *header;  /* sentinel, never holds real data */
    int level;               /* highest lane currently in use */
    int size;
};

void initSkipList(struct SkipList *list);

/* Returns the new node, or NULL on duplicate ID / out of memory */
struct Product *skipInsert(struct SkipList *list, int productID,
                           const char *name, float price, int stock);

/* Returns the product or NULL. *steps (optional) receives the comparison count. */
struct Product *skipSearch(struct SkipList *list, int productID, int *steps);

void freeSkipList(struct SkipList *list);

#endif