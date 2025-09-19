document.addEventListener('DOMContentLoaded', function () {
    // Select all resizer elements
    const resizers = document.querySelectorAll('.resizer');

    resizers.forEach(resizer => {
        // Add event listener for mouse down on each resizer
        resizer.addEventListener('mousedown', onMouseDown);
        // Add touch support for mobile devices
        resizer.addEventListener('touchstart', onMouseDown, { passive: false });
    });

    function onMouseDown(e) {
        // Prevent default actions, like text selection, which can interfere with dragging
        e.preventDefault();

        const resizer = e.currentTarget;
        const leftColumn = resizer.previousElementSibling;
        const rightColumn = resizer.nextElementSibling;

        // Ensure we have valid columns to resize
        if (!leftColumn || !rightColumn) {
            return;
        }

        // Get the starting X position of the mouse or touch
        const startX = e.pageX || e.touches[0].pageX;

        // Get the initial widths of the columns
        const leftColumnStartWidth = leftColumn.offsetWidth;
        const rightColumnStartWidth = rightColumn.offsetWidth;

        // Define the function to be called on mouse move
        const onMouseMove = (moveEvent) => {
            // Get current mouse/touch position
            const currentX = moveEvent.pageX || moveEvent.touches[0].pageX;
            // Calculate the distance the mouse has moved
            const deltaX = currentX - startX;

            // Calculate the new widths
            const newLeftWidth = leftColumnStartWidth + deltaX;
            const newRightWidth = rightColumnStartWidth - deltaX;
            
            // Get the minimum width from the column's computed style (or default to 75px)
            const minWidthPx = parseInt(getComputedStyle(leftColumn).minWidth) || 75;

            // Check if the new widths are greater than the minimum width
            if (newLeftWidth > minWidthPx && newRightWidth > minWidthPx) {
                // Set the new widths using flex-basis in pixels.
                // Using pixels is more reliable and performant during the drag operation.
                leftColumn.style.flexBasis = newLeftWidth + 'px';
                rightColumn.style.flexBasis = newRightWidth + 'px';
            }
        };

        // Define the function to be called on mouse up
        const onMouseUp = () => {
            // Remove the event listeners from the document to stop tracking mouse/touch movement
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('touchmove', onMouseMove);
            document.removeEventListener('touchend', onMouseUp);

            // Restore default cursor and text selection behavior
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        };

        // Add the move and up listeners to the entire document.
        // This allows the user to continue dragging even if the cursor leaves the resizer element.
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('touchmove', onMouseMove, { passive: false });
        document.addEventListener('touchend', onMouseUp);

        // Change cursor and disable text selection for a better user experience during drag
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }
});