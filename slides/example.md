---
marp: true
theme: byui
paginate: true
_paginate: false
---

<!-- _class: title -->

# Example Slide Deck
## A Few Things You May Want To Do
Brother Crosby

---

# Content Slide

This is a basic content slide.
- Bullet point 1
- Bullet point 2
  - Sub point
- Bullet point 3

You can also use **bold** and *italic* text.

---

<!-- _class: section-header -->

# Section Header
## Deep dive into features

---

# Picture in Content

Here is how you can include a picture in the slide content.

![bg right:40%](../assets/sample-image.jpg)

- The image is placed on the right.
- Text continues on the left.
- Marp directives like `bg right` handle layout.

---

# YouTube Video Embed

Marp can embed videos via HTML `<iframe>` tags.

<div style="text-align: center;">
<iframe width="800" height="450" src="https://www.youtube.com/embed/tgbNymZ7vqY" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
</div>

---

# Background Images

You can use other images from the PPTX as backgrounds.

![bg](../assets/content-bg.jpg)

# Custom Backgrounds
## Make your slides pop!
---

# Two Column Layout

Using the custom `.columns` utility class:

<div class="columns">
<div>

### Left Column
- Item A
- Item B
- Item C

</div>
<div>

### Right Column
- Item D
- Item E
- Item F

</div>
</div>

---

# Python Code Example

You can include code blocks with syntax highlighting:

```python
def hello_byui():
    message = "Welcome to BYU-Idaho!"
    print(message)

# Call the function
hello_byui()
```

- Standard Markdown syntax is supported.
- Highlights keywords, strings, and comments.

---

# Mermaid Diagrams

You can now include Mermaid diagrams directly in your slides:

```mermaid
graph LR
    A[Markdown] --> B(Preprocessor)
    B --> C{Success?}
    C -- Yes --> D[Marp Slide]
    C -- No --> E[Error]
```

---

!!!include(questions.md)!!!
