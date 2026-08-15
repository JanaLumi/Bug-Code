# Bug-Code
Games to familiarise with G-Code


Normalising CNC and breaking it out of specialized, gatekept engineering software. Turning mathematical curves into live toolpaths to give people immediate, visual feedback on how equations manifest in the physical world.

Recap of game concepts, followed by how to structure the Math/LaTeX Function Plotter tool and multi-screen system.
1. Previous CNC Game & Features Roadmap
 * Subterranean Wood-Carving Theme: Using the carpenter ant / beetle aesthetic, where cutting through wood reveals different depth layers (sapwood down to dark heartwood).
 * Interactive Toolpath Visualiser: Stepping through G-code line-by-line (G00, G01, G02/G03 arc interpolation) with real-time speed, feed rate, and Z-depth tracking.
 * Level/Puzzle System: Challenges where players must write or modify G-code to carve specific shapes (e.g., Hilbert curves, spirals, pockets) while avoiding obstacles or material boundaries.
 * G-Code Preset Library: Built-in templates ranging from basic straight paths to complex fractal patterns to teach syntax progressively.
2. Multi-Screen Architecture Concept
To keep the UI clean without overcrowding the primary G-code editor, we can move to a multi-screen workspace:
 * Screen 1: Code & Stepper Editor (Current View)
   Direct G-code text editor, line-by-line stepper, console logs, and beetle simulation canvas.
 * Screen 2: Math & Parametric Curve Generator (New View)
   A specialized workbench for inputting mathematical equations and converting them into cut paths.
 * Screen 3: Level Select / Sandbox Gallery
   A view for selecting carving challenges or saving custom creations.
3. Math & LaTeX Generator Workflow
Instead of forcing users to manually calculate hundreds of points, the generator turns mathematical functions into G01 linear segments.

```
+-----------------------------------------------------------------------+
|  LaTeX / Math Input Field                                             |
|  f(x) = 20 * \sin(x / 10) + 50                                        |
|  [ Visual LaTeX Helper Palette:  sin()  |  cos()  |  x²  |  π  |  √ ] |
+-----------------------------------------------------------------------+
                                  │
                                  ▼
+-----------------------------------------------------------------------+
|  Domain & Cutting Parameters                                          |
|  • X Range: [0 to 300]   • Resolution / Step (dx): 2mm                |
|  • Cut Depth (Z): -2mm   • Feed Rate (F): 400                         |
+-----------------------------------------------------------------------+
                                  │
                                  ▼
+-----------------------------------------------------------------------+
|  [ Generate G-Code ] ──> Sends generated code directly to Screen 1    |
+-----------------------------------------------------------------------+
```

4. Supporting Multiple Functions & LaTeX Accessibility
 * Multiple Functions Stack:
   Users can add multiple function layers (e.g., f_1(x) for a wave top, f_2(x) for a floor profile, or parametric equations x(t) and y(t) for spirals and loops). Each function can have its own cut depth (Z) or feed rate (F).
 * Interactive LaTeX / Visual Helper Palette:
   Since LaTeX syntax like \sin(x) or \frac{a}{b} is unfamiliar to non-academic users, the helper palette offers clickable buttons:
   * Clicking \sin(x) inserts \sin() and formats the input cleanly.
   * A live preview renders the equation using a lightweight renderer (like MathJax or KaTeX) right above the input field so users see standard mathematical notation.
   * An automated parser converts the LaTeX input into standard JavaScript Math expressions behind the scenes (e.g., \sin(x) \rightarrow Math.sin(x)).
When you are ready to start building this next iteration, we can begin by laying down the multi-screen tab structure or writing the Math-to-Gcode parsing logic!

## Other planned features

Other core features for the CNC game:
 * Audio & Haptic Feedback: Adding sound effects for motor whines (pitch shifting based on Feed Rate F), cutting/crunching sounds when digging into wood (Z <= 0), and rapid movement clicks.
 * Material & Tool Bit Selector: Letting users swap materials (e.g., soft pine, hard oak, brass) which changes required feed rates, along with selecting different bit shapes (V-bit, flat endmill, ball nose) that alter line widths and cutting profiles.
 * Import/Export & File Handler: Allowing players to export their generated G-code to .nc or .gcode files to run on real physical CNC machines, as well as uploading existing G-code files into the simulator canvas.
 * Coordinate System & Origin Modes: Adding visual origin markers for switching between Work Coordinate System (WCS) setups, like Machine Home vs. Local Zero (G54), and toggling between Absolute (G90) and Relative (G91) positioning.
Which of these rings a bell, or should we double-check the initial setup notes together?
