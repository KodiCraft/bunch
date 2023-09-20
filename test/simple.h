// Simple test header file with a couple of functions

#ifndef SIMPLE_H
#define SIMPLE_H

/// @brief Prints a formatted string to stdout
/// @param fmt Format string 
/// @param ... Variable arguments
void printf(const char *fmt, ...);

/// @brief Adds two numbers together
/// @param a First number
/// @param b Second number
/// @return Sum of both numbers
int add(int a, int b);

void* malloc(int size);

// This is here to test if we can do pointer pointers
char** funny(char* a, char* b);
          // ^ bun knows char* as a cstring, which helps us out a bit

typedef int funnyType;

funnyType funny2(char*a, char*b);

#endif // SIMPLE_H