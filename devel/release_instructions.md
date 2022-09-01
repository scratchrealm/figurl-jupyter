* Remove the 'dev' entry in _version.py.

* Update the version in package.json

* Git commit

* Relase the npm packages:

```bash
npm login
npm publish
```

* Build the assets and publish

```bash
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

* Commit the changes.

```bash
git push
git push --tags.
```