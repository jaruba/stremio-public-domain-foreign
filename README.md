# Foreign Public Domain Movies Add-on for Stremio

Stremio add-on for foreign public domain movies (or otherwise free-to-view movies).

This project is a community effort, all movie data and streaming sources are written by hand in the [Meta Object](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/meta.md) format and are available to edit (and add to) in the [movies folder](./movies) by creating pull requests to this repository.

Please ensure that all movies here can be watched freely by Stremio users, we understand that copyright can change in time and do not wish to add movies that breach copyright laws.

If you believe that a movie has been added wrongfully to this repository, please create an issue or a PR in favor of removing that movie that also includes information to identify you as the rightful copyright holder, or as a spokesman for the copyright holder.


## How to Install in Stremio

This add-on is available in Stremio's internal add-on catalog under the name "Public Domain Foreign Movies" in the "Community Add-ons" section.


## Programmatical Usage

```
git clone https://github.com/jaruba/stremio-public-domain-foreign.git
cd stremio-public-domain-foreign
npm install
npm start
```

Optional: If you also have an OMDB API Key, you can set that as the `OMDB_KEY` process environment variable in order to make more movie posters available in the add-on's catalogs.
