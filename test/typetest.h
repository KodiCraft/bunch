typedef int number;
typedef char* string;
typedef number fatnumber;

typedef struct {
    number x;
    number y;
} point;

number add(number a, number b);
point* make_point(number x, number y);