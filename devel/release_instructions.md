* Remove the 'dev' entry in _version.py.

* No need to update in package.json and _frontend.py if we did that correctly last release

* Git commit

* Relase the npm packages:

```bash
npm login
npm publish
```

* Build the assets and publish

```bash
rm dist/*
python -m build .
twine check dist/*
twine upload dist/*
```

* Tag the release commit

```bash
git tag <python package version identifier>)
```

* Update the version in _version.py, and put it back to dev (e.g. 0.1.0 -> 0.2.0.dev). 

* Update the versions of the npm packages (without publishing).

* Update the version in _frontend.py

* Commit the changes.

```bash
git push
git push --tags.
```