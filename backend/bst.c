#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "bst.h"


/* Create a new product node */
struct Product* createProduct(
    int productID,
    char name[],
    float price,
    int stock)
{
    struct Product *newNode;

    newNode = (struct Product*)malloc(sizeof(struct Product));

    if (newNode == NULL)
    {
        printf("Memory allocation failed!\n");
        return NULL;
    }

    newNode->productID = productID;
    strcpy(newNode->name, name);
    newNode->price = price;
    newNode->stock = stock;

    newNode->left = NULL;
    newNode->right = NULL;

    return newNode;
}


/* Insert product into BST */
struct Product* insertProduct(
    struct Product *root,
    int productID,
    char name[],
    float price,
    int stock)
{
    if (root == NULL)
    {
        return createProduct(
            productID,
            name,
            price,
            stock
        );
    }

    if (productID < root->productID)
    {
        root->left = insertProduct(
            root->left,
            productID,
            name,
            price,
            stock
        );
    }
    else if (productID > root->productID)
    {
        root->right = insertProduct(
            root->right,
            productID,
            name,
            price,
            stock
        );
    }
    else
    {
        printf("Product ID already exists!\n");
    }

    return root;
}


/* Search product */
struct Product* searchProduct(
    struct Product *root,
    int productID)
{
    if (root == NULL)
    {
        return NULL;
    }

    if (productID == root->productID)
    {
        return root;
    }

    if (productID < root->productID)
    {
        return searchProduct(
            root->left,
            productID
        );
    }

    return searchProduct(
        root->right,
        productID
    );
}


/* Display products using inorder traversal */
void displayProducts(struct Product *root)
{
    if (root != NULL)
    {
        displayProducts(root->left);

        printf(
            "ID: %d | Name: %s | Price: %.2f | Stock: %d\n",
            root->productID,
            root->name,
            root->price,
            root->stock
        );

        displayProducts(root->right);
    }
}