/**
 * @jest-environment jsdom
 */

require("../../src/digitalSafetyQuiz.js");
require("../../src/quizDashboard.js");

describe("DashboardView", () => {
  test("werkt met automatische verversing", () => {
    jest.useFakeTimers();
    let view;

    try {
      document.body.innerHTML = '<div id="dashboard"></div>';
      const container = document.getElementById("dashboard");

      const firstSnapshot = {
        dateKey: "digitalSafetyQuiz:sessions:2024-05-01",
        totals: { activeParticipants: 0, correct: 0, incorrect: 0 },
        activeSessions: [],
        totalSessions: 0
      };

      const secondSnapshot = {
        dateKey: "digitalSafetyQuiz:sessions:2024-05-01",
        totals: { activeParticipants: 2, correct: 5, incorrect: 1 },
        activeSessions: [
          {
            id: "session-1",
            name: "Tester",
            correct: 3,
            incorrect: 0,
            startTime: new Date().toISOString()
          }
        ],
        totalSessions: 1
      };

      const store = {
        getSnapshot: jest.fn()
      };
      store.getSnapshot
        .mockReturnValueOnce(firstSnapshot)
        .mockReturnValue(secondSnapshot);

      const { DashboardView } = window.DSQDashboard;
      view = new DashboardView(container, store, { refreshIntervalMs: 500 });

      const metricValues = container.querySelectorAll(
        ".dsq-dashboard-metric-value"
      );
      expect(metricValues[0].textContent).toBe("0");
      expect(store.getSnapshot).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(600);

      expect(store.getSnapshot).toHaveBeenCalledTimes(2);
      expect(metricValues[0].textContent).toBe("2");
      expect(metricValues[1].textContent).toBe("5");
      expect(metricValues[2].textContent).toBe("1");
    } finally {
      if (view) {
        view.destroy();
      }
      jest.useRealTimers();
    }
  });
});
