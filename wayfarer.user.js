// ==UserScript==
// @name        WayfarerApp
// @namespace   example
// @version     1.1.1
// @description Changes the background color of the webpage
// @match       https://wayfarer.nianticlabs.com/*
// @downloadURL https://github.com/davidgamings/wayfarer/raw/main/wayfarer.user.js
// @updateURL   https://github.com/davidgamings/wayfarer/raw/main/wayfarer.meta.js
// @grant       none
// @run-at      document-start
// @require     https://code.jquery.com/jquery-3.6.0.min.js
// ==/UserScript==

(() => {
    let profile = null;
    (function (open) {
        XMLHttpRequest.prototype.open = function (method, url) {
            const args = this;
            if (url == '/api/v1/vault/review' && method == 'GET') {
                this.addEventListener('load', handleXHRResult(handleIncomingReview), false);
            }
            else if (url == '/api/v1/vault/properties' && method == 'GET') {
                this.addEventListener('load', handleXHRResult(handleProfile), false);
            }
            else if (url == '/api/v1/vault/manage' && method == 'GET') {
                this.addEventListener('load', handleXHRResult(handleNominations), false);
            }
            open.apply(this, arguments);
        };
    })(XMLHttpRequest.prototype.open);

    // Overwrite the send method of the XMLHttpRequest.prototype to intercept POST data
    (function (send) {
        XMLHttpRequest.prototype.send = function (dataText) {
            try {
                const data = JSON.parse(dataText);
                const xhr = this;
                this.addEventListener('load', handleXHRResult(function (result) {
                    if (xhr.responseURL == window.origin + '/api/v1/vault/review') {
                        handleSubmittedReview(data, result).catch(console.error);
                    }
                }), false);
            } catch (err) { }
            send.apply(this, arguments);
        };
    })(XMLHttpRequest.prototype.send);


    const handleIncomingReview = input => new Promise((resolve, reject) => {
        console.log(input);
        fetch('https://wayfarer.test/api/incoming-review?XDEBUG_SESSION_START=PHPSTORM', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                result: input,
                profile: profile,
            })
        })
            .then(response => response.json())
            .then(result => {
                console.log(result);
                let clickFinal = false;
                let buttonName = 'wayfarerrtssbutton_1';
                if (result.review != null) {
                    var titleElement = document.querySelector('.wf-page-header__title.ng-star-inserted div.ng-star-inserted');
                    titleElement.textContent = "Beoordelen (" + result.count + " Review gevonden)";
                    // handle normal nomination
                    if (result.categories.length > 0) {
                        const ratings = [
                            { value: result.review.quality, selector: '.ng-star-inserted ul.wf-rate' },
                            { value: result.review.description, selector: '#title-description-card ul.wf-rate' },
                            { value: result.review.location, selector: '.max-w-full .ng-star-inserted ul.wf-rate' },
                            { value: result.review.cultural, selector: '#historical-cultural-card ul.wf-rate' },
                            { value: result.review.uniqueness, selector: '#visually-unique-card ul.wf-rate' },
                            { value: result.review.safety, selector: '#safe-access-card ul.wf-rate' },
                        ];

                        ratings.forEach(function (rating) {
                            selectStar(rating.value, rating.selector);
                        });


                        const toggleGroups = document.querySelectorAll('mat-button-toggle-group');
                        const jaButtons = [];

                        toggleGroups.forEach((group) => {
                            const neeButtons = group.querySelectorAll('button.mat-button-toggle-button span.mat-button-toggle-label-content');
                            neeButtons.forEach((button) => {
                                if (button.innerText === 'Nee') {
                                    button.parentNode.click();
                                }
                            });

                            if (result.categories.some(category => group.innerText.includes(category))) {
                                const jaButton = group.querySelector('button.mat-button-toggle-button span.mat-button-toggle-label-content');
                                if (jaButton && jaButton.innerText === 'Ja') {
                                    jaButtons.push(jaButton);
                                }
                            }
                        });

                        setTimeout(function () {
                            jaButtons.forEach((button) => {
                                button.parentNode.click();
                            });
                        }, 1000);
                    }

                    // handle rejection
                    if (result.review.reject_reason != null) {
                        selectStar(1, '.ng-star-inserted ul.wf-rate');
                        setTimeout(function () {
                            const divs = document.querySelectorAll('.mat-list-item-content');
                            let category = '';
                            if (result.review.reject_reason === "CRITERIA") category = "Andere afwijzingscriteria";
                            if (result.review.reject_reason === "PRIVATE") category = "Private eigendom of boerderij";
                            if (result.review.reject_reason === "TEXT_BAD") category = "Titel of beschrijving";
                            if (result.review.reject_reason === "SCHOOL") category = "School (lager/midelbaar)";
                            if (result.review.reject_reason === "TEMPORARY") category = "Tijdelijk of seizoensgebonden display";
                            if (result.review.reject_reason === "NATURAL") category = "Natuurlijk element";
                            divs.forEach(div => {
                                const matListText = div.querySelector('.mat-list-text');
                                if (matListText && matListText.innerHTML.includes(category)) {
                                    div.click();
                                }
                            });
                        }, 1000);
                        buttonName = 'wayfarerrtssbutton_r';
                    }

                    // handle duplicate
                    if (result.review.duplicate_of != null) {
                        let marker = document.querySelector('agm-marker[id="' + result.review.duplicate_of + '"]')
                        if (marker) {
                            const button = marker.querySelector('button');
                            if (button) {
                                button.click();
                            }
                        }
                        buttonName = 'wayfarerrtssbutton_d';
                    }

                    // handle edit
                    if (result.edits.length > 0) {
                        // handle photo
                        if (result.type == "PHOTO") {
                            document.querySelector('.photo-card__overlay').click();
                        }

                        // handle edit (title, description and location)
                        if (result.type == "EDIT") {
                            //handle title and description
                            var radioButtons = document.querySelectorAll('.mat-radio-container');
                            radioButtons.forEach((button) => {
                                result.edits.forEach((hash) => {
                                    if (button.innerText.includes(hash)) {
                                        button.parentNode.click();
                                    }
                                });
                            });

                            // handle location
                            setTimeout(function () {
                                const divElement = document.querySelector('div[option-idx="0"]');
                                if (divElement) {
                                    divElement.click();
                                }
                            }, 1000);
                        }
                    }

                    clickFinal = true;
                } else {
                    // handle photo 
                    if (input.type == "PHOTO") {
                        document.querySelector('.photo-card__overlay').click();
                        clickFinal = true;
                    }

                    // handle location
                    setTimeout(function () {
                        const divElement = document.querySelector('div[option-idx="0"]');
                        if (divElement) {
                            divElement.click();
                            clickFinal = true;
                        }
                    }, 1000);
                }

                if (clickFinal) {
                    setTimeout(function () {
                        let button = document.getElementById(buttonName);
                        if (button) {
                            button.click();
                        }
                    }, 4000);
                }
            })
            .catch(error => {
                console.error(error);
            });
    });

    function selectStar(value, selector) {
        var ul = document.querySelector(selector);
        var element = ul.getElementsByTagName('li')[value - 1];
        element.click();
    }

    const handleSubmittedReview = (review, response) => new Promise((resolve, reject) => {
        console.log(review);
        if (response === 'api.review.post.accepted' && review.hasOwnProperty('id')) {
            fetch('https://wayfarer.test/api/submitted-review?XDEBUG_SESSION_START=PHPSTORM', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    result: review,
                    profile: profile,
                })
            })
                .then(response => response.json())
                .then(result => {
                    console.log(result);
                })
                .catch(error => {
                    console.error(error);
                });
        }
    });

    const handleNominations = result => new Promise((resolve, reject) => {
        fetch('https://wayfarer.test/api/handle-nominations?XDEBUG_SESSION_START=PHPSTORM', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                result: result,
                profile: profile,
            })
        })
            .then(response => response.json())
            .then(result => {
                console.log(result);
            })
            .catch(error => {
                console.error(error);
            });
    });

    // Get a user ID to properly handle browsers shared between several users. Store a hash only, for privacy.
    const handleProfile = ({ socialProfile }) => {
        profile = socialProfile;
    };

    // Perform validation on result to ensure the request was successful before it's processed further.
    // If validation passes, passes the result to callback function.
    const handleXHRResult = callback => function (e) {
        try {
            const response = this.response;
            const json = JSON.parse(response);
            if (!json) return;
            if (json.captcha) return;
            if (!json.result) return;
            callback(json.result, e);
        } catch (err) {
            console.error(err);
        }
    };
})();
