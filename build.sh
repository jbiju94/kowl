#!/bin/sh

# NOTE: This is a direct port from the Docker File

export REACT_APP_KOWL_GIT_SHA="e5965f84f8d9437e4be5217815e98e237fa40554"
export REACT_APP_KOWL_GIT_REF="master"
export REACT_APP_KOWL_TIMESTAMP="1616434815050"

echo "Build based on commit: "${REACT_APP_KOWL_GIT_SHA}
############################################################
# Backend Build
############################################################
echo "Processing backend..."
# shellcheck disable=SC2164
cd backend

echo "Getting Dependencies"
go mod download

echo "Building Go Module"
# GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -v github.com/constabulary/gb/cmd/gb
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o ../kowl ./cmd/api
# Compiled backend binary is in root named 'kowl'

############################################################
# Frontend Build
############################################################
echo "Processing frontend..."
# shellcheck disable=SC2164
cd ../frontend
echo "Getting Dependencies"
npm clean-install

echo "Building npm project"
npm run build
# All the built frontend files for the SPA are now in '/build/'

cp -r ./build ../build

# shellcheck disable=SC2103
cd ..

echo "Build Done."
#./kowl