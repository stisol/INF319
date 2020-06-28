/* eslint-disable */

import { Question, QuestionName, QuestionLocate, QuestionType, GetQuestionTypeName } from "./Question";
import { LabelManager } from "../labels/labelManager";
import { Quiz, QuizStorage } from "./quizStorage";
import { Label } from "../labels/Label";
import { ModelManager } from "../modelManager";


export default class QuizMasterManager {
    private questions: Question[] = [];
    private quizGuid: string | null = null;
    private labelManager: LabelManager;
    private nextQuestionId = 0;

    /// Constructs a new QuizMasterManager
    /// If quizGuid is not null, it will attempt to load the selected quiz and
    /// call the provided callback function with the quiz information.
    /// This callback must initialize the label manager to fully load the quiz.
    public constructor(
        labelManager: LabelManager,
        quizGuid: string | null,
        showEditor: boolean,
        callback: ((_: Quiz) => Promise<void>) | null = null
    ) {
        this.quizGuid = quizGuid;
        this.labelManager = labelManager;

        (document.getElementById("quiz-add-locate") as HTMLButtonElement)
            .onclick = this.addQuestion.bind(this, QuestionType.Locate);
        (document.getElementById("quiz-add-name") as HTMLButtonElement)
            .onclick = this.addQuestion.bind(this, QuestionType.Name);
        (document.getElementById("quiz-save") as HTMLButtonElement)
            .onclick = this.saveQuestions.bind(this);
        (document.getElementById("quiz-update") as HTMLButtonElement)
            .onclick = this.updateQuestions.bind(this);
        (document.getElementById("quiz-delete") as HTMLButtonElement)
            .onclick = this.deleteQuestions.bind(this);
        (document.getElementById("quiz-take") as HTMLButtonElement)
            .onclick = this.takeQuiz.bind(this);

        // Show editor
        if (showEditor) {
            document.getElementById("quiz-editor")?.classList.remove("hide");
        }

        if (quizGuid != null) {
            document.getElementById("quiz-update")?.classList.remove("hide");
            document.getElementById("quiz-delete")?.classList.remove("hide");
            document.getElementById("quiz-take")?.classList.remove("hide");

            if (callback != null) {
                this.loadQuestions(quizGuid, callback);
            }
        }

    }

    public questionCount(): number {
        return this.questions.length;
    }

    public getQuestion(index: number): Question {
        return this.questions[index];
    }

    public addQuestion(questionType: QuestionType) {
        let label = this.labelManager.lastClickedLabel();
        if (label == null) label = this.labelManager.labels[0];
        let question: Question;
        switch (questionType) {
            case QuestionType.Name:
                question = new QuestionName(this.nextQuestionId++, label.id);
                break;
            case QuestionType.Locate:
                question = new QuestionLocate(this.nextQuestionId++, label.id);
                break;
        }

        this.questions.push(question);
        this.createRow(question, label);
    }

    public createRow(question: Question, label: Label): HTMLDivElement {
        const element = document.createElement("div");
        element.className = "question-editor";
        element.id = "question-" + String(question.id);

        const header = document.createElement("h3");
        header.innerText = "Question #" + String(question.id)
            + ": " + GetQuestionTypeName(question.questionType);
        element.append(header);

        const textArea = document.createElement("textarea");
        textArea.innerText = question.textPrompt;
        textArea.id = element.id + "-textPrompt"
        element.append(textArea);

        const regionPicker = document.createElement("button");
        regionPicker.id = element.id + "-regionpicker"
        regionPicker.onclick = this.setRegion.bind(this, question.id);
        element.append(regionPicker);

        switch (question.questionType) {
            case QuestionType.Locate: {
                const q = question as QuestionLocate;
                const showRegionsCheck = document.createElement("input");
                showRegionsCheck.type = "checkbox";
                showRegionsCheck.checked = q.showRegions;
                showRegionsCheck.id = element.id + "-showRegions";
                element.append(showRegionsCheck);

                const showRegionsLabel = document.createElement("label");
                showRegionsLabel.innerText = "Display regions";
                element.append(showRegionsLabel);

                regionPicker.innerText = "Answer: " + label.name;
                break;
            }
            case QuestionType.Name: {
                const q = question as QuestionName;
                const textAnswer = document.createElement("input");
                textAnswer.type = "text";
                textAnswer.value = q.textAnswer;
                textAnswer.placeholder = "Answer";
                textAnswer.id = element.id + "-textAnswer";
                element.append(textAnswer);

                regionPicker.innerText = "Label: " + label.name;
                if (question.textPrompt == "")
                    textArea.innerText = "What is the name of this region?";
                break;
            }
        }

        const deleteLink = document.createElement("a");
        deleteLink.innerText = "❌";
        deleteLink.onclick = this.deleteRow.bind(this, question.id);
        element.append(deleteLink);

        document.getElementById("questions")?.append(element);

        return element;
    }

    public setRegion(questionId: number): void {
        const label = this.labelManager.lastClickedLabel();
        if (label == null) return;
        const index = this.getIndexForQuestion(questionId);
        this.questions[index].labelId = label.id;
        const buttonId = "question-" + questionId + "-regionpicker";
        const button = (document.getElementById(buttonId) as HTMLButtonElement);

        switch (this.questions[index].questionType) {
            case QuestionType.Locate: button.innerText = "Answer: " + label.name; break;
            case QuestionType.Name: button.innerText = "Label: " + label.name; break;
        }
    }

    public deleteRow(questionId: number): void {
        document.getElementById("question-" + String(questionId))?.remove();
        const index = this.getIndexForQuestion(questionId);

        this.questions.splice(index, 1);
    }

    public getIndexForQuestion(questionId: number): number {
        let index = -1;
        for (let i = 0; i < this.questions.length; i++) {
            if (this.questions[i].id === questionId) {
                index = i;
                break;
            }
        }
        if (index === -1) throw "Could not find position in label list.";
        return index;
    }

    public async loadQuestions(quizGuid: string, callback: ((_: Quiz) => Promise<void>)) {
        const quiz = await QuizStorage.loadQuizAsync(quizGuid);
        this.questions = quiz.questions;
        // Before populating the UI, we need the name of the labels
        // Before getting the labels, we need the model...

        await callback(quiz);

        quiz.questions.forEach(q => {
            this.nextQuestionId = Math.max(this.nextQuestionId, q.id + 1);
            const label = this.labelManager.getLabel(q.labelId);
            if (label != null) {
                this.createRow(q, label);
            } else {
                console.error("Label " + q.labelId + " not found!");
            }
        });
    }

    public saveQuestions(): void {
        this.updateDataFromUi();
        QuizStorage.storeQuiz(this.serialize());
    }

    public updateQuestions(): void {
        this.updateDataFromUi();
        if (this.quizGuid == null) throw "No stored quiz!";
        QuizStorage.updateQuiz(this.quizGuid, this.serialize());
    }

    public deleteQuestions(): void {
        if (this.quizGuid == null) throw "No stored quiz!";
        QuizStorage.deleteQuiz(this.quizGuid, this.labelManager.getSavedLabelUuid());
    }

    private updateDataFromUi(): void {
        for (const question of this.questions) {
            const id = "question-" + question.id;
            const textPrompt = document.getElementById(id + "-textPrompt");
            question.textPrompt = (textPrompt as HTMLTextAreaElement).value;

            switch (question.questionType) {
                case QuestionType.Locate: {
                    const q = question as QuestionLocate;
                    const showRegions = document.getElementById(id + "-showRegions");
                    q.showRegions = (showRegions as HTMLInputElement).checked;
                    break;
                }
                case QuestionType.Name: {
                    const q = question as QuestionName;
                    const textAnswer = document.getElementById(id + "-textAnswer");
                    q.textAnswer = (textAnswer as HTMLInputElement).value;
                    break;
                }
            }
        }
    }

    private serialize(): Quiz {
        const labelUuid = this.labelManager.getSavedLabelUuid();
        if (labelUuid == null) throw "No labels loaded?";
        return new Quiz(
            this.questions,
            this.labelManager.getModelName(),
            labelUuid
        );
    }

    private takeQuiz(): void {
        window.location.href = window.origin + location.pathname
            + "?quiz=" + this.quizGuid;
    }
}
