import SVG_INFO from "../static/help-circle.svg";
import SVG_WARNING from "../static/alert-circle.svg";
import SVG_ERROR from "../static/x-octagon.svg";

/**
 * Manages the 
 */
export default class Notification {
    private static PARENT = document.getElementById("status-bar-list") as HTMLUListElement;

    /**
     * Adds a message to the status bar that can be removed with the returned callback. Otherwise it 
     * is removed after the given time.
     * @param message The message to display.
     * @param status The kind of status message this is.
     * @param seconds How many seconds to wait before automatically returning it.
     * @returns A function that when called, immediately removes the message, regardless of timeout.
     */
    public static message(message: string, status: StatusType, seconds = 15): () => void {
        const element = this.add(message, status);
        const callback = this.remove.bind(this, element);
        setTimeout(callback, seconds * 1000);

        const statusbar = document.getElementById("status-bar") as HTMLDivElement;
        statusbar.classList.remove("hide");

        return callback;
    }

    /**
     * Does the actual rendering of the user interface element.
     * @param message The message to display.
     * @param status The kind of status message this is.
     */
    private static add(message: string, status: StatusType): HTMLElement {
        const element = document.createElement("li");
        element.classList.add("status-message");
        const icon = document.createElement("div");
        icon.classList.add("status-message-icon");
        switch (status) {
            case StatusType.Info:
                icon.innerHTML = SVG_INFO;
                element.classList.add("status-info");
                break;
            case StatusType.Error:
                icon.innerHTML = SVG_ERROR;
                element.classList.add("status-error");
                break;
            case StatusType.Warning:
                icon.innerHTML = SVG_WARNING;
                element.classList.add("status-warning");
                break;
        }
        const textElement = document.createElement("span");
        textElement.classList.add("status-message-text");
        textElement.innerText = message;
        element.appendChild(icon);
        element.appendChild(textElement);
        Notification.PARENT.appendChild(element);

        return element;
    }

    /**
     * Removes the given element, hiding the status bar if it was the last message.
     * @param element The element to remove.
     */
    private static remove(element: HTMLElement | null): void {
        element?.remove();

        const messages = document.getElementsByClassName("status-message");
        if (messages.length == 0) {
            const statusbar = document.getElementById("status-bar") as HTMLDivElement;
            statusbar.classList.add("hide");
        }
    }
}

/**
 * The kind of status a message is.
 */
export enum StatusType {
    Info,
    Warning,
    Error,
}
