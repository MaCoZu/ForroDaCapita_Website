# Modal Utils - Robust Backdrop Close Functionality

This utility provides a more reliable way to handle modal backdrop clicks using coordinate-based detection instead of simple event target checking.

## The Problem with Basic Backdrop Close

The traditional approach:

```javascript
modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    closeModal()
  }
})
```

This approach is fragile because:

- It only works if you click exactly on the backdrop element
- Fails when there are padding divs, overlays, or other elements between backdrop and content
- Can break with complex nested DOM structures

## The Solution: Coordinate-Based Detection

Our robust approach uses `getBoundingClientRect()` to calculate the actual boundaries of the modal content and checks if the click coordinates fall outside those boundaries.

## Usage Examples

### Basic Usage

```javascript
import { addRobustBackdropClose } from './modalUtils.js'

const modal = document.getElementById('myModal')
const modalContent = modal.querySelector('.modal-content')

addRobustBackdropClose(modal, modalContent, () => {
  modal.classList.add('hidden')
})
```

### Enhanced Usage with Escape Key

```javascript
import {
  addEnhancedModalClose,
  createHiddenClassChecker,
} from './modalUtils.js'

const modal = document.getElementById('myModal')
const modalContent = modal.querySelector('.modal-content')
const isModalOpen = createHiddenClassChecker(modal)

addEnhancedModalClose(
  modal,
  modalContent,
  () => {
    modal.classList.add('hidden')
  },
  isModalOpen
)
```

### DaisyUI Checkbox Modals

```javascript
import {
  addRobustBackdropClose,
  createCheckboxModalChecker,
} from './modalUtils.js'

const modalToggle = document.getElementById('myModalToggle')
const modal = document.querySelector('.modal')
const modalContent = modal.querySelector('.modal-box')
const isModalOpen = createCheckboxModalChecker(modalToggle)

addRobustBackdropClose(modal, modalContent, () => {
  modalToggle.checked = false
})
```

## API Reference

### `addRobustBackdropClose(modal, modalContent, closeCallback)`

Adds coordinate-based backdrop close functionality to a modal.

**Parameters:**

- `modal` (HTMLElement): The modal container element
- `modalContent` (HTMLElement): The modal content element that should stay open when clicked
- `closeCallback` (Function): Function to call when backdrop is clicked

### `addEnhancedModalClose(modal, modalContent, closeCallback, isModalOpenCallback)`

Adds both backdrop close and escape key functionality.

**Parameters:**

- `modal` (HTMLElement): The modal container element
- `modalContent` (HTMLElement): The modal content element
- `closeCallback` (Function): Function to call when backdrop is clicked or escape is pressed
- `isModalOpenCallback` (Function): Function that returns true if modal is currently open

### Helper Functions

- `createHiddenClassChecker(modal)`: Creates a function to check if modal is open (not hidden)
- `createCheckboxModalChecker(modalToggle)`: Creates a function to check if DaisyUI modal is open
- `hasClass(element, className)`: Simple helper to check if element has a class

## Implementation in Current Components

### SplideSlider.astro

Updated to use coordinate-based detection for the gallery modal.

### FindUs.astro

Both map modal and images modal updated with robust backdrop close.

### Lost_Found.astro

Uses SplideSlider component, so inherits the robust functionality.

## Benefits

1. **More Reliable**: Works regardless of DOM structure complexity
2. **Better UX**: Users can click anywhere outside content to close
3. **Consistent**: Same behavior across all screen sizes and layouts
4. **Maintainable**: Centralized utility functions for reuse
5. **Robust**: Handles edge cases that basic approaches miss
