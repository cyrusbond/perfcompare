import { CompareResultsItem, Repository, RevisionsList } from '../types/state';
import { Framework } from '../types/types';

// This file contains functions to request the Treeherder API

export const treeherderBaseURL = 'https://treeherder.mozilla.org';

type FetchProps = {
  baseRepo: Repository['name'];
  baseRev: string;
  newRepo: Repository['name'];
  newRev: string;
  framework: Framework['id'];
};

// This fetches data from the Treeherder API /api/perfcompare/results.
// This API returns the results of a comparison between 2 revisions.
export async function fetchCompareResults({
  baseRev,
  baseRepo,
  newRev,
  newRepo,
  framework,
}: FetchProps) {
  const searchParams = new URLSearchParams({
    base_repository: baseRepo,
    base_revision: baseRev,
    new_repository: newRepo,
    new_revision: newRev,
    framework: String(framework),
    interval: '86400',
    no_subtests: 'true',
  });

  const response = await fetch(
    `${treeherderBaseURL}/api/perfcompare/results/?${searchParams.toString()}`,
  );
  if (!response.ok) {
    if (response.status === 400) {
      throw new Error(
        `Error when requesting treeherder: ${await response.text()}`,
      );
    } else {
      throw new Error(
        `Error when requesting treeherder: (${response.status}) ${response.statusText}`,
      );
    }
  }

  return response.json() as Promise<CompareResultsItem[]>;
}

// This function returns fake comparison results from mock files.
export async function fetchFakeCompareResults(commitHash: string) {
  const module = (await import(`../mockData/${commitHash}`)) as {
    comparisonResults: CompareResultsItem[];
  };
  return module.comparisonResults;
}

export type RecentRevisionsParams = {
  repository: string;
  hash?: string | undefined;
  author?: string | undefined;
};

// This computes the URL to the Treeherder API /api/project depending on whether
// we want to optionally filter by author or revision.
function computeUrlFromSearchTermAndRepository({
  repository,
  hash,
  author,
}: RecentRevisionsParams) {
  const baseUrl = `${treeherderBaseURL}/api/project/${repository}/push/`;

  if (author) {
    return baseUrl + '?author=' + encodeURIComponent(author);
  }

  if (hash) {
    return baseUrl + '?revision=' + hash;
  }

  return baseUrl + '?hide_reviewbot_pushes=true';
}

// This fetches the recent revisions on a specific repository, optionally
// filtering by hash or author, using the Treeherder API /api/project.
export async function fetchRecentRevisions(params: RecentRevisionsParams) {
  const url = computeUrlFromSearchTermAndRepository(params);
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 400) {
      throw new Error(
        `Error when requesting treeherder: ${await response.text()}`,
      );
    } else {
      throw new Error(
        `Error when requesting treeherder: (${response.status}) ${response.statusText}`,
      );
    }
  }

  const json = (await response.json()) as { results: RevisionsList[] };
  return json.results;
}
