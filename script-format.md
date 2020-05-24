# Script format

From the `File` menu, you can compile a script from a better format to the format used by nx-TAS.

## First - Script use

If a line doesn't fit the script format, it will be ignored by the compiler. This is a good way to use comments in your scripts.

The first item of each line is the number of frames to wait from the last line. For the first line in the script, use `+`. If you don't understand, take a look at `example.txt`.

You can include any number of parameters for each line, separated by spaces. Buttons will be pressed until they are released, and control sticks will stay in their positions until changed. These are the parameters you can choose from:

`ON`: This presses the keys listed inside the brackets. Example: `ON{KEY_X,KEY_Y}` presses the X and Y buttons. Do not include a space in between the keys.

`OFF`: This lets go of the keys listed inside the brackets. Example: `OFF{KEY_X,KEY_Y}` releases the X and Y buttons. Again, don't include a space between the keys.

`RAW`: This presses the keys inside the brackets and releases all the other keys. Example: `RAW{KEY_ZL,KEY_Y}` turns off all keys except ZL and Y which are pressed.

`LSTICK`: This sets the position of the left stick. The first number is the angle in degrees from straight ahead, moving clockwise (90 is straight to the left). The second number is how far the stick goes. The maximum is 32767, but it will round down to that for you if you go over. Do not include a space between the two numbers. Example: `LSTICK{180,15000}` will pull the left stick straight back, about halfway.

`RSTICK`: Works the same as `LSTICK` but for the right stick.

### Example

Read `example.txt` to see an example script. You can see the output from this code in `output.txt`.

### Valid keys

All keys from the normal nx-TAS scripts are allowed, plus `NONE` and `ALL`. You cannot use these in the `RAW` parameter, however.

## Second - Script functions

You can include the built-in functions for a game like this: `BUILTINS SMO`.
This will essentially work like you had added the functions yourself.
The only current supported game is Super Mario Odyssey. (`BUILTINS SMO` or `BUILTINS supermariodyssey`)

At any point in the script, you can also define a function like this:

```
DEF CENTER_CAMERA {
1 ON{KEY_L}
3 OFF{KEY_L}
}
```

Later in the script, you can use this function like this:

```
+ ON{KEY_B} LSTICK{0,32767}
CENTER_CAMERA
1 OFF{ALL}
```

The preprocessor will replace all the `CENTER_CAMERA` lines with the contents of the definition.
