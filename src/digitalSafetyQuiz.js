(function (global) {
  "use strict";

  const defaultConfig = {
    title: "Digitaal Veiligheidsrijbewijs",
    description:
      "Doorloop de modules, beantwoord de vragen en verdien het certificaat voor digitale veiligheid!",
    modules: [
      {
        id: "wachtwoorden",
        title: "Sterke wachtwoorden",
        intro:
          "Een sterk wachtwoord is lang, uniek en bevat cijfers, letters en symbolen. Gebruik geen informatie die andere mensen makkelijk kunnen raden, zoals je naam of verjaardag.",
        tips: [
          "Maak wachtwoorden van minimaal 12 tekens",
          "Gebruik een wachtwoordmanager of een wachtwoordzin",
          "Deel je wachtwoord nooit met anderen"
        ],
        questions: [
          {
            id: "pw-1",
            text: "Welk wachtwoord is het veiligst?",
            type: "single",
            options: [
              { id: "a", label: "123456" },
              { id: "b", label: "voetbal" },
              { id: "c", label: "H0nd!sPr!ngt" }
            ],
            correct: ["c"],
            feedback: {
              correct: "Klopt! Dit wachtwoord is lang en gebruikt hoofdletters, cijfers en symbolen.",
              incorrect: "Niet helemaal. Kies een wachtwoord dat lang is en verschillende soorten tekens gebruikt."
            }
          },
          {
            id: "pw-2",
            text: "Wat is een goede manier om een wachtwoord te onthouden?",
            type: "single",
            options: [
              { id: "a", label: "Schrijf het wachtwoord op een briefje en plak het op je scherm." },
              { id: "b", label: "Gebruik een grappige zin en maak daar een wachtwoord van." },
              { id: "c", label: "Gebruik hetzelfde wachtwoord voor alles." }
            ],
            correct: ["b"],
            feedback: {
              correct: "Heel goed! Een wachtwoordzin is makkelijk te onthouden en moeilijk te raden.",
              incorrect: "Probeer een wachtwoordzin te gebruiken. Dat is veiliger dan overal hetzelfde wachtwoord."}
          }
        ]
      },
      {
        id: "delen",
        title: "Slim delen",
        intro:
          "Op internet hoef je niet alles te delen. Denk na voordat je iets plaatst of verstuurt. Vraag jezelf af: zou ik dit ook in de klas laten zien?",
        tips: [
          "Plaats geen persoonlijke gegevens zoals adressen of telefoonnummers",
          "Vraag toestemming voordat je foto's van anderen deelt",
          "Zet je profiel op privé wanneer mogelijk"
        ],
        questions: [
          {
            id: "share-1",
            text: "Je wilt een leuke foto van een klasgenoot delen. Wat doe je?",
            type: "single",
            options: [
              { id: "a", label: "Ik plaats de foto meteen." },
              { id: "b", label: "Ik vraag eerst of het mag." },
              { id: "c", label: "Ik stuur de foto naar iedereen in mijn contacten." }
            ],
            correct: ["b"],
            feedback: {
              correct: "Super! Vraag altijd toestemming voordat je iets deelt wat niet van jou is.",
              incorrect: "Vraag altijd eerst toestemming voordat je een foto deelt."}
          },
          {
            id: "share-2",
            text: "Welke informatie kun je het beste voor jezelf houden?",
            type: "multiple",
            options: [
              { id: "a", label: "Je lievelingskleur" },
              { id: "b", label: "Je thuisadres" },
              { id: "c", label: "Je geheime wachtwoord" }
            ],
            correct: ["b", "c"],
            feedback: {
              correct: "Goed gedaan! Adressen en wachtwoorden zijn privé.",
              incorrect: "Denk eraan dat persoonlijke gegevens zoals adressen en wachtwoorden geheim moeten blijven."}
          }
        ]
      },
      {
        id: "online-vrienden",
        title: "Online vrienden",
        intro:
          "Niet iedereen online is wie hij zegt dat hij is. Wees voorzichtig met nieuwe online vrienden en bespreek vreemde situaties met een volwassene die je vertrouwt.",
        tips: [
          "Accepteer geen vriendschapsverzoeken van onbekenden",
          "Praat met je ouders of leerkracht als iemand je ongemakkelijk laat voelen",
          "Spreek niet af met iemand die je alleen via internet kent"
        ],
        questions: [
          {
            id: "friends-1",
            text: "Wat doe je als iemand die je niet kent je een bericht stuurt?",
            type: "single",
            options: [
              { id: "a", label: "Ik reageer meteen en vertel veel over mezelf." },
              { id: "b", label: "Ik vertel het aan een volwassene die ik vertrouw." },
              { id: "c", label: "Ik ga met die persoon afspreken." }
            ],
            correct: ["b"],
            feedback: {
              correct: "Heel goed! Praat altijd met een volwassene als iemand je iets vreemd vraagt.",
              incorrect: "Vertel het aan een volwassene die je vertrouwt en reageer niet zomaar."}
          }
        ]
      }
    ],
    certificateMessage:
      "Gefeliciteerd! Je hebt alle modules voltooid en toont dat jij veilig en slim online kunt zijn.",
    strings: {
      startButton: "Start de quiz",
      nextModule: "Volgende module",
      continue: "Ga verder",
      checkAnswer: "Controleer antwoord",
      nextQuestion: "Volgende vraag",
      selectOptions: "Selecteer je antwoord", 
      selectMultiple: "Selecteer een of meer antwoorden",
      feedbackCorrect: "Goed gedaan!",
      feedbackIncorrect: "Probeer het nog eens.",
      moduleComplete: "Module afgerond!",
      certificateTitle: "Jouw digitale veiligheidsrijbewijs",
      enterName: "Vul je naam in voor op het certificaat",
      downloadButton: "Download als afbeelding",
      resetButton: "Opnieuw beginnen"
    }
  };

  function createElement(tag, options = {}) {
    const el = document.createElement(tag);
    if (options.className) {
      el.className = options.className;
    }
    if (options.text) {
      el.textContent = options.text;
    }
    if (options.html) {
      el.innerHTML = options.html;
    }
    if (options.attrs) {
      Object.entries(options.attrs).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          el.setAttribute(key, value);
        }
      });
    }
    return el;
  }

  function normalizeConfig(userConfig = {}) {
    const config = JSON.parse(JSON.stringify(defaultConfig));
    if (!userConfig) {
      return config;
    }

    if (userConfig.title) config.title = userConfig.title;
    if (userConfig.description) config.description = userConfig.description;
    if (userConfig.modules) config.modules = userConfig.modules;
    if (userConfig.certificateMessage) {
      config.certificateMessage = userConfig.certificateMessage;
    }
    if (userConfig.strings) {
      config.strings = { ...config.strings, ...userConfig.strings };
    }
    return config;
  }

  class DigitalSafetyQuiz {
    constructor(options = {}) {
      this.config = normalizeConfig(options.config);
      this.container =
        typeof options.container === "string"
          ? document.querySelector(options.container)
          : options.container;
      if (!this.container) {
        throw new Error(
          "DigitalSafetyQuiz: kon de container niet vinden. Geef een element of CSS-selector door."
        );
      }
      this.currentModuleIndex = -1;
      this.currentQuestionIndex = -1;
      this.score = 0;
      this.totalQuestions = this.config.modules.reduce(
        (count, module) => count + module.questions.length,
        0
      );
      this.renderBaseLayout();
    }

    renderBaseLayout() {
      this.container.innerHTML = "";
      this.container.classList.add("dsq-wrapper");

      this.headerEl = createElement("header", { className: "dsq-header" });
      const titleEl = createElement("h1", {
        className: "dsq-title",
        text: this.config.title
      });
      const descEl = createElement("p", {
        className: "dsq-description",
        text: this.config.description
      });
      this.progressEl = createElement("div", { className: "dsq-progress" });

      this.headerEl.append(titleEl, descEl, this.progressEl);

      this.mainEl = createElement("main", { className: "dsq-main" });
      this.footerEl = createElement("footer", { className: "dsq-footer" });

      this.container.append(this.headerEl, this.mainEl, this.footerEl);

      this.renderIntro();
    }

    renderIntro() {
      this.mainEl.innerHTML = "";
      this.footerEl.innerHTML = "";

      const introCard = createElement("section", {
        className: "dsq-card dsq-intro"
      });
      introCard.append(
        createElement("h2", { text: "Welkom!" }),
        createElement("p", {
          text: "In deze quiz leer je hoe je veilig en slim online blijft. Ben je klaar?"
        })
      );

      const startButton = createElement("button", {
        className: "dsq-button",
        text: this.config.strings.startButton
      });
      startButton.addEventListener("click", () => {
        this.startQuiz();
      });

      introCard.append(startButton);
      this.mainEl.append(introCard);
      this.updateProgress();
    }

    startQuiz() {
      this.currentModuleIndex = 0;
      this.currentQuestionIndex = -1;
      this.score = 0;
      this.renderModuleIntro();
    }

    get currentModule() {
      return this.config.modules[this.currentModuleIndex];
    }

    renderModuleIntro() {
      const module = this.currentModule;
      if (!module) {
        this.renderCertificate();
        return;
      }

      this.mainEl.innerHTML = "";
      this.footerEl.innerHTML = "";

      const moduleEl = createElement("section", { className: "dsq-card" });
      moduleEl.append(
        createElement("h2", { text: module.title }),
        createElement("p", { text: module.intro })
      );

      if (module.tips && module.tips.length) {
        const tipsTitle = createElement("h3", { text: "Tips" });
        const tipsList = createElement("ul", { className: "dsq-tip-list" });
        module.tips.forEach((tip) => {
          tipsList.append(createElement("li", { text: tip }));
        });
        moduleEl.append(tipsTitle, tipsList);
      }

      const continueButton = createElement("button", {
        className: "dsq-button",
        text: this.config.strings.continue
      });
      continueButton.addEventListener("click", () => {
        this.currentQuestionIndex = 0;
        this.renderQuestion();
      });
      moduleEl.append(continueButton);

      this.mainEl.append(moduleEl);
      this.updateProgress();
    }

    renderQuestion() {
      const module = this.currentModule;
      const question = module.questions[this.currentQuestionIndex];
      if (!question) {
        this.renderModuleComplete();
        return;
      }

      this.mainEl.innerHTML = "";
      this.footerEl.innerHTML = "";

      const questionCard = createElement("section", { className: "dsq-card" });
      questionCard.append(
        createElement("h2", { text: module.title }),
        createElement("h3", { text: question.text })
      );

      const instructions = question.type === "multiple"
        ? this.config.strings.selectMultiple
        : this.config.strings.selectOptions;
      questionCard.append(
        createElement("p", {
          className: "dsq-instructions",
          text: instructions
        })
      );

      const form = createElement("form", { className: "dsq-question-form" });
      const optionType = question.type === "multiple" ? "checkbox" : "radio";
      const nameAttr = `q-${module.id}-${question.id}`;

      question.options.forEach((option) => {
        const optionId = `${nameAttr}-${option.id}`;
        const wrapper = createElement("label", {
          className: "dsq-option"
        });
        const input = createElement("input", {
          attrs: {
            type: optionType,
            name: optionType === "radio" ? nameAttr : optionId,
            value: option.id,
            id: optionId
          }
        });
        const fakeControl = createElement("span", { className: "dsq-option-control" });
        const text = createElement("span", {
          className: "dsq-option-label",
          text: option.label
        });
        wrapper.append(input, fakeControl, text);
        form.append(wrapper);
      });

      const feedbackEl = createElement("div", {
        className: "dsq-feedback",
        attrs: { "aria-live": "polite", role: "status" }
      });
      const button = createElement("button", {
        className: "dsq-button",
        text: this.config.strings.checkAnswer,
        attrs: { type: "submit" }
      });

      const nextQuestionButton = createElement("button", {
        className: "dsq-button dsq-button-secondary",
        text: this.config.strings.nextQuestion,
        attrs: { type: "button" }
      });
      nextQuestionButton.disabled = true;

      let hasRecordedScore = false;

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const answers = Array.from(
          form.querySelectorAll("input:checked")
        ).map((input) => input.value);

        if (!answers.length) {
          feedbackEl.textContent =
            question.type === "multiple"
              ? this.config.strings.selectMultiple
              : this.config.strings.selectOptions;
          feedbackEl.classList.remove("dsq-feedback-correct");
          feedbackEl.classList.add("dsq-feedback-incorrect");
          return;
        }

        const isCorrect = this.evaluateAnswer(question, answers);
        if (isCorrect) {
          if (!hasRecordedScore) {
            this.score += 1;
            hasRecordedScore = true;
          }
          feedbackEl.textContent = question.feedback?.correct || this.config.strings.feedbackCorrect;
          feedbackEl.classList.remove("dsq-feedback-incorrect");
          feedbackEl.classList.add("dsq-feedback-correct");

          button.disabled = true;
          form.querySelectorAll("input").forEach((input) => {
            input.disabled = true;
          });
          nextQuestionButton.disabled = false;
          nextQuestionButton.focus();
        } else {
          feedbackEl.textContent = question.feedback?.incorrect || this.config.strings.feedbackIncorrect;
          feedbackEl.classList.remove("dsq-feedback-correct");
          feedbackEl.classList.add("dsq-feedback-incorrect");
        }
      });

      questionCard.append(form, feedbackEl);
      this.mainEl.append(questionCard);
      this.footerEl.innerHTML = "";
      nextQuestionButton.addEventListener("click", () => {
        if (nextQuestionButton.disabled) {
          return;
        }
        this.currentQuestionIndex += 1;
        this.renderQuestion();
      });
      this.footerEl.append(nextQuestionButton);

      this.updateProgress();
    }

    evaluateAnswer(question, answers) {
      if (!answers.length) {
        return false;
      }
      const expected = [...question.correct].sort();
      const received = [...answers].sort();
      return (
        expected.length === received.length &&
        expected.every((value, index) => value === received[index])
      );
    }

    renderModuleComplete() {
      this.mainEl.innerHTML = "";
      this.footerEl.innerHTML = "";
      const module = this.currentModule;

      const completeCard = createElement("section", { className: "dsq-card" });
      completeCard.append(
        createElement("h2", { text: module.title }),
        createElement("p", {
          text: `${this.config.strings.moduleComplete} (${this.score}/${this.totalQuestions})`
        })
      );

      const nextButton = createElement("button", {
        className: "dsq-button",
        text: this.config.strings.nextModule
      });
      nextButton.addEventListener("click", () => {
        this.currentModuleIndex += 1;
        this.currentQuestionIndex = -1;
        if (this.currentModuleIndex >= this.config.modules.length) {
          this.renderCertificate();
        } else {
          this.renderModuleIntro();
        }
      });

      completeCard.append(nextButton);
      this.mainEl.append(completeCard);
      this.updateProgress();
    }

    renderCertificate() {
      this.mainEl.innerHTML = "";
      this.footerEl.innerHTML = "";

      const certificateCard = createElement("section", {
        className: "dsq-card dsq-certificate"
      });

      certificateCard.append(
        createElement("h2", { text: this.config.strings.certificateTitle }),
        createElement("p", { text: this.config.certificateMessage })
      );

      const nameInput = createElement("input", {
        attrs: {
          type: "text",
          placeholder: this.config.strings.enterName,
          "aria-label": this.config.strings.enterName
        },
        className: "dsq-input"
      });

      const certificatePreview = createElement("div", {
        className: "dsq-certificate-preview"
      });

      const updatePreview = () => {
        const name = nameInput.value.trim() || "[Jouw naam]";
        certificatePreview.innerHTML = `
          <div class="dsq-certificate-frame">
            <h3>${this.config.title}</h3>
            <p>${this.config.certificateMessage}</p>
            <p class="dsq-certificate-name">${name}</p>
            <p class="dsq-certificate-score">Score: ${this.score}/${this.totalQuestions}</p>
          </div>
        `;
      };

      nameInput.addEventListener("input", updatePreview);
      updatePreview();

      const downloadButton = createElement("button", {
        className: "dsq-button",
        text: this.config.strings.downloadButton
      });
      downloadButton.addEventListener("click", () => {
        this.downloadCertificate(certificatePreview);
      });

      const resetButton = createElement("button", {
        className: "dsq-button dsq-button-secondary",
        text: this.config.strings.resetButton
      });
      resetButton.addEventListener("click", () => {
        this.renderIntro();
      });

      certificateCard.append(nameInput, certificatePreview, downloadButton, resetButton);
      this.mainEl.append(certificateCard);
      this.updateProgress(true);
    }

    downloadCertificate(previewEl) {
      if (!window.html2canvas) {
        const warning = createElement("div", {
          className: "dsq-feedback dsq-feedback-incorrect",
          text: "Kan certificaat niet downloaden. Laad html2canvas voordat je deze functie gebruikt."
        });
        this.mainEl.append(warning);
        return;
      }
      html2canvas(previewEl).then((canvas) => {
        const link = document.createElement("a");
        link.download = "digitaal-veiligheidsrijbewijs.png";
        link.href = canvas.toDataURL();
        link.click();
      });
    }

    updateProgress(isComplete = false) {
      const moduleCount = this.config.modules.length;
      let completedModules = this.currentModuleIndex;
      let completedQuestions = 0;

      if (this.currentModuleIndex >= 0) {
        completedModules = Math.max(0, this.currentModuleIndex);
        const modulesBefore = this.config.modules.slice(0, this.currentModuleIndex);
        completedQuestions = modulesBefore.reduce(
          (count, module) => count + module.questions.length,
          0
        );
        if (this.currentQuestionIndex > -1) {
          completedQuestions += this.currentQuestionIndex;
        } else if (this.currentQuestionIndex === -1 && this.currentModuleIndex >= moduleCount) {
          completedQuestions = this.totalQuestions;
        }
      }

      const progressPercentage = isComplete
        ? 100
        : Math.floor((completedQuestions / this.totalQuestions) * 100);

      this.progressEl.innerHTML = `
        <div class="dsq-progress-bar">
          <div class="dsq-progress-bar-fill" style="width: ${progressPercentage}%"></div>
        </div>
        <span class="dsq-progress-text">${completedQuestions}/${this.totalQuestions} vragen afgerond</span>
      `;
    }
  }

  global.DigitalSafetyQuiz = DigitalSafetyQuiz;
})(typeof window !== "undefined" ? window : this);

