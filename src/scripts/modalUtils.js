/**
 * Robust modal backdrop close functionality
 * Uses getBoundingClientRect() to accurately detect clicks outside modal content
 *
 * @param {HTMLElement} modal - The modal container element
 * @param {HTMLElement} modalContent - The modal content element (what should stay open when clicked)
 * @param {Function} closeCallback - Function to call when backdrop is clicked
 */
export function addRobustBackdropClose(modal, modalContent, closeCallback) {
  if (!modal || !modalContent || typeof closeCallback !== 'function') {
    console.warn('addRobustBackdropClose: Invalid parameters provided')
    return
  }
  modal.addEventListener('click', (event) => {
    const rect = modalContent.getBoundingClientRect()
    const isInModal =
      rect.top <= event.clientY &&
      event.clientY <= rect.top + rect.height &&
      rect.left <= event.clientX &&
      event.clientX <= rect.left + rect.width

    if (!isInModal) {
      closeCallback()
    }
  })
}

/**
 * Enhanced modal backdrop close that also handles escape key
 *
 * @param {HTMLElement} modal - The modal container element
 * @param {HTMLElement} modalContent - The modal content element
 * @param {Function} closeCallback - Function to call when backdrop is clicked or escape is pressed
 * @param {Function} isModalOpenCallback - Function that returns true if modal is currently open
 */
export function addEnhancedModalClose(
  modal,
  modalContent,
  closeCallback,
  isModalOpenCallback
) {
  // Add robust backdrop close
  addRobustBackdropClose(modal, modalContent, closeCallback)

  // Add escape key handler
  document.addEventListener('keydown', (event) => {
    if (
      event.key === 'Escape' &&
      isModalOpenCallback &&
      isModalOpenCallback()
    ) {
      closeCallback()
    }
  })
}

/**
 * Simple helper to check if an element has a specific class (for hidden state checking)
 *
 * @param {HTMLElement} element - Element to check
 * @param {string} className - Class name to check for
 * @returns {boolean} - True if element has the class
 */
export function hasClass(element, className) {
  return element && element.classList.contains(className)
}

/**
 * Helper to create a modal open state checker for elements using 'hidden' class
 *
 * @param {HTMLElement} modal - The modal element
 * @returns {Function} - Function that returns true if modal is open (not hidden)
 */
export function createHiddenClassChecker(modal) {
  return () => modal && !modal.classList.contains('hidden')
}

/**
 * Helper to create a modal open state checker for DaisyUI checkbox modals
 *
 * @param {HTMLInputElement} modalToggle - The checkbox input that controls the modal
 * @returns {Function} - Function that returns true if modal is open (checkbox is checked)
 */
export function createCheckboxModalChecker(modalToggle) {
  return () => modalToggle && modalToggle.checked
}
