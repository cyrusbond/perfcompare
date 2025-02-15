import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';

import App, { router } from '../components/App';
import getTestData from './utils/fixtures';
import { render, screen, FetchMockSandbox } from './utils/test-utils';

describe('App', () => {
  beforeEach(() => {
    const { testData } = getTestData();
    (global.fetch as FetchMockSandbox)
      .get('glob:https://treeherder.mozilla.org/api/project/*/push/*', {
        results: [],
      })
      .get('begin:https://treeherder.mozilla.org/api/project/', {
        results: [testData[0]],
      });
  });

  test('Should render search view on default route', async () => {
    render(<App />);

    // Title appears
    expect(screen.getByText(/PerfCompare/i)).toBeInTheDocument();

    act(() => void jest.runAllTimers());
    const homeText = screen.getByText('Compare with a base or over time');
    expect(homeText).toBeInTheDocument();
  });

  test('Should switch between dark mode and light mode on toggle', async () => {
    // set delay to null to prevent test time-out due to useFakeTimers
    const user = userEvent.setup({ delay: null });

    render(<App />);

    const darkModeButton = screen.getByLabelText('Dark mode');

    await user.click(darkModeButton);
    expect(screen.getByLabelText('Light mode')).toBeInTheDocument();

    await user.click(darkModeButton);
    expect(screen.queryByLabelText('Light mode')).not.toBeInTheDocument();
  });

  describe('CompareResults loader', () => {
    it('Should render an error page when the treeherder request fails with an error 500', async () => {
      // Silence console.error for a better console output. We'll check its result later.
      jest.spyOn(console, 'error').mockImplementation(() => {});
      (window.fetch as FetchMockSandbox).get(
        'begin:https://treeherder.mozilla.org/api/perfcompare/results/',
        500,
      );

      await router.navigate(
        '/compare-results/?baseRev=spam&baseRepo=mozilla-central&framework=2',
      );
      render(<App />);

      await screen.findByText(/Error/);
      expect(console.error).toHaveBeenCalledWith(
        new Error(
          'Error when requesting treeherder: (500) Internal Server Error',
        ),
      );
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(document.body).toMatchSnapshot();
    });

    it('Should render an error page when the treeherder request fails with an error 400', async () => {
      // Silence console.error for a better console output. We'll check its result later.
      jest.spyOn(console, 'error').mockImplementation(() => {});
      (window.fetch as FetchMockSandbox).get(
        'begin:https://treeherder.mozilla.org/api/perfcompare/results/',
        {
          status: 400,
          body: 'Treeherder request error',
        },
      );

      await router.navigate(
        '/compare-results/?baseRev=spam&baseRepo=mozilla-central&framework=2',
      );
      render(<App />);

      await screen.findByText(/Error/);
      expect(console.error).toHaveBeenCalledWith(
        new Error('Error when requesting treeherder: Treeherder request error'),
      );
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(document.body).toMatchSnapshot();
    });

    it('Should render an error page when the requested URL is invalid', async () => {
      // Silence console.error for a better console output. We'll check its result later.
      // If an expectation toHaveBeenCalledTimes fails, it might be easier to
      // remove the mockImplementation part to debug.
      jest.spyOn(console, 'error').mockImplementation(() => {});

      // Error 1: no baseRev
      await router.navigate('/compare-results/');
      render(<App />);
      expect(await screen.findByText(/baseRev/)).toMatchSnapshot();
      expect(console.error).toHaveBeenCalledWith(
        new Error('The parameter baseRev is missing.'),
      );
      expect(console.error).toHaveBeenCalledTimes(1);
      (console.error as jest.Mock).mockClear();

      // Error 2: no baseRepo
      await act(() => router.navigate('/compare-results/?baseRev=spam'));
      expect(await screen.findByText(/baseRepo/)).toMatchSnapshot();
      expect(console.error).toHaveBeenCalledWith(
        new Error('The parameter baseRepo is missing.'),
      );
      expect(console.error).toHaveBeenCalledTimes(1);
      (console.error as jest.Mock).mockClear();

      // Error 3: not the same amount of newRevs and newRepos
      await act(() =>
        router.navigate(
          '/compare-results/?baseRev=spam&baseRepo=try&newRev=foo&newRepo=try&newRepo=mozilla-central',
        ),
      );
      expect(await screen.findByText(/"newRepo"/)).toMatchSnapshot();
      expect(console.error).toHaveBeenCalledWith(
        new Error(
          'There should be as many "newRepo" parameters as there are "newRev" parameters.',
        ),
      );
      expect(console.error).toHaveBeenCalledTimes(1);
      (console.error as jest.Mock).mockClear();

      // Error 4: unknown baseRepo value
      await act(() =>
        router.navigate('/compare-results/?baseRev=spam&baseRepo=UNKNOWN'),
      );
      expect(await screen.findByText(/"UNKNOWN"/)).toMatchSnapshot();
      expect(console.error).toHaveBeenCalledWith(
        new Error(
          'The parameter baseRepo "UNKNOWN" should be one of mozilla-central, try, mozilla-beta, mozilla-release, autoland, fenix.',
        ),
      );
      expect(console.error).toHaveBeenCalledTimes(1);
      (console.error as jest.Mock).mockClear();

      // Error 5: unknown newRepo value
      await act(() =>
        router.navigate(
          '/compare-results/?baseRev=spam&baseRepo=try&newRev=foo&newRepo=UNKNOWN',
        ),
      );
      expect(await screen.findByText(/"UNKNOWN"/)).toMatchSnapshot();
      expect(console.error).toHaveBeenCalledWith(
        new Error(
          'Every parameter newRepo "UNKNOWN" should be one of mozilla-central, try, mozilla-beta, mozilla-release, autoland, fenix.',
        ),
      );
      expect(console.error).toHaveBeenCalledTimes(1);
      (console.error as jest.Mock).mockClear();

      // Error 6: invalid framework value
      await act(() =>
        router.navigate(
          '/compare-results/?baseRev=spam&baseRepo=try&framework=FOO',
        ),
      );
      expect(await screen.findByText(/"FOO"/)).toMatchSnapshot();
      expect(console.error).toHaveBeenCalledWith(
        new Error(
          'The parameter framework should be a number, but it is "FOO".',
        ),
      );
      expect(console.error).toHaveBeenCalledTimes(1);
      (console.error as jest.Mock).mockClear();

      // Error 7: unknown framework value
      await act(() =>
        router.navigate(
          '/compare-results/?baseRev=spam&baseRepo=try&framework=25',
        ),
      );
      expect(await screen.findByText(/"25"/)).toMatchSnapshot();
      expect(console.error).toHaveBeenCalledWith(
        new Error(`The parameter framework isn't a valid value: "25".`),
      );
      expect(console.error).toHaveBeenCalledTimes(1);
      (console.error as jest.Mock).mockClear();
    });
  });
});
