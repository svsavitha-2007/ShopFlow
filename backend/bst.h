#ifndef BST_H
#define BST_H

struct Product
{
    int productID;
    char name[50];
    float price;
    int stock;

    struct Product *left;
    struct Product *right;
};

struct Product* createProduct(int productID, char name[], float price, int stock);

struct Product* insertProduct(
    struct Product *root,
    int productID,
    char name[],
    float price,
    int stock
);

struct Product* searchProduct(
    struct Product *root,
    int productID
);

void displayProducts(struct Product *root);

#endif