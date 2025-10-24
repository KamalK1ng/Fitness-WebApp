# git config --global user.name "KamalK1ng"
# git config --global user.email "nichalosking@gmail.com"

# git init
# git add .
# git commit -m "initial commit for api"
# git branch -M main

# git remote add origin https://github.com/KamalK1ng/Fitness-WebApp.git
# git push -u origin main

# 1) See what remote is set to
git remote -v

# 2) Fix the remote to your real repo
git remote set-url origin https://github.com/KamalK1ng/Fitness-WebApp.git

# 3) Make sure you’re on 'main' and have a commit
git branch -M main
git add .
git commit -m "init: functions api (track, metrics, contact)"

# 4) If the GitHub repo is EMPTY, just push:
git push -u origin main
